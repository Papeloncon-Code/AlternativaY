import {
  CompressionType,
  OnesieHeader,
  OnesieHeaderType,
  OnesieInnertubeRequest,
  OnesieInnertubeResponse,
  OnesieProxyStatus,
  OnesieRequest,
  SabrError,
  UMPPartId,
} from 'googlevideo/protos';
import type { ApiResponse } from 'youtubei.js/web';
import { Constants } from 'youtubei.js/web';
import { CompositeBuffer, UmpReader } from 'googlevideo/ump';
import { base64ToU8 } from 'googlevideo/utils';
import type { Part } from 'googlevideo/shared-types';
import {
  encryptRequest,
  fetchFunction,
  fetchRedirectorUrl,
  type OnesieHotConfig,
} from './helpers';

type OnesieRequestArgs = {
  clientConfig: OnesieHotConfig;
  innertubeRequest: Record<string, any>;
};

type PartHandler = (part: Part) => void;

async function prepareOnesieRequest(args: OnesieRequestArgs) {
  const { innertubeRequest, clientConfig } = args;
  const { baseUrl, clientKeyData, encryptedClientKey, onesieUstreamerConfig } = clientConfig;

  const headers = [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'User-Agent', value: innertubeRequest.context.client.userAgent },
    { name: 'X-Goog-Visitor-Id', value: innertubeRequest.context.client.visitorData },
  ];

  const onesieInnertubeRequest = OnesieInnertubeRequest.encode({
    url: 'https://youtubei.googleapis.com/youtubei/v1/player?key=' +
      'AIzaSyDCU8hByM-4DrUqRUYnGn-3llEO78bcxq8&$fields=' +
      'playerConfig,storyboards,captions,playabilityStatus,streamingData,' +
      'responseContext.mainAppWebResponseContext.datasyncId,videoDetails.isLive,' +
      'videoDetails.isLiveContent,videoDetails.title,videoDetails.author,' +
      'playbackTracking.videostatsPlaybackUrl,playbackTracking.videostatsWatchtimeUrl',
    headers,
    body: JSON.stringify(innertubeRequest),
    proxiedByTrustedBandaid: true,
    skipResponseEncryption: true,
  }).finish();

  const { encrypted, hmac, iv } = await encryptRequest(clientKeyData, onesieInnertubeRequest);
  const body = OnesieRequest.encode({
    urls: [],
    innertubeRequest: {
      iv,
      hmac,
      enableCompression: true,
      encryptedClientKey,
      encryptedOnesieInnertubeRequest: encrypted,
      serializeResponseAsJson: true,
      ustreamerFlags: { sendVideoPlaybackConfig: false },
    },
    streamerContext: {
      sabrContexts: [],
      unsentSabrContexts: [],
      clientInfo: {
        clientName: parseInt(
          Constants.CLIENT_NAME_IDS[
            innertubeRequest.context.client.clientName as keyof typeof Constants.CLIENT_NAME_IDS
          ],
        ),
        clientVersion: innertubeRequest.context.client.clientVersion,
      },
    },
    reloadPlaybackParams: innertubeRequest.playbackContext?.reloadPlaybackContext,
    bufferedRanges: [],
    onesieUstreamerConfig,
  }).finish();

  const encodedVideoId = Array.from(base64ToU8(innertubeRequest.videoId))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  return { baseUrl, body, encodedVideoId };
}

/**
 * Onesie Player request adapted from the MIT-licensed Kira implementation.
 * It returns only the player response; media segments are delivered directly
 * to Shaka in the user's browser and never relayed through TodoTube's Worker.
 */
export async function makePlayerRequest(args: OnesieRequestArgs): Promise<ApiResponse> {
  const { baseUrl, body, encodedVideoId } = await prepareOnesieRequest(args);
  const redirectorResponseUrl = await fetchRedirectorUrl();
  let url = redirectorResponseUrl.split('/initplayback')[0] + baseUrl;

  const queryParams = [
    'id=' + encodedVideoId,
    'cmo:sensitive_content=yes',
    'opr=1',
    'osts=0',
    'por=1',
    'rn=0',
  ];
  url += '&' + queryParams.join('&');

  const response = await fetchFunction(url, {
    method: 'POST',
    body: body as unknown as BodyInit,
  });
  if (!response.ok) throw new Error('Onesie endpoint returned HTTP ' + response.status + '.');

  const arrayBuffer = await response.arrayBuffer();
  const reader = new UmpReader(new CompositeBuffer([new Uint8Array(arrayBuffer)]));
  const onesie: Array<ReturnType<typeof OnesieHeader.decode> & { data?: Uint8Array }> = [];

  const handlers = new Map<UMPPartId, PartHandler>([
    [UMPPartId.SABR_ERROR, (part) => {
      const data = part.data.chunks[0];
      const error = SabrError.decode(data);
      console.warn('[TodoTube] Onesie SABR response:', error);
    }],
    [UMPPartId.ONESIE_HEADER, (part) => {
      onesie.push(OnesieHeader.decode(part.data.chunks[0]));
    }],
    [UMPPartId.ONESIE_DATA, (part) => {
      const data = part.data.chunks[0];
      if (onesie.length > 0) onesie[onesie.length - 1].data = data;
    }],
  ]);

  reader.read((part) => handlers.get(part.type)?.(part));

  const playerResponse = onesie.find((header) => header.type === OnesieHeaderType.ONESIE_PLAYER_RESPONSE);
  if (!playerResponse?.cryptoParams || !playerResponse.data) {
    throw new Error('Onesie player response did not include data or crypto parameters.');
  }

  let responseData: Uint8Array = playerResponse.data;
  if (playerResponse.cryptoParams.compressionType === CompressionType.GZIP) {
    const decompressor = new DecompressionStream('gzip');
    const stream = new Blob([responseData]).stream().pipeThrough(decompressor);
    responseData = new Uint8Array(await new Response(stream).arrayBuffer());
  }

  const decoded = OnesieInnertubeResponse.decode(responseData);
  if (decoded.onesieProxyStatus !== OnesieProxyStatus.OK) {
    throw new Error('Onesie proxy status is not OK.');
  }
  if (decoded.httpStatus !== 200 || !decoded.body) {
    throw new Error('Onesie player request returned HTTP ' + decoded.httpStatus + '.');
  }

  return JSON.parse(new TextDecoder().decode(decoded.body)) as ApiResponse;
}
