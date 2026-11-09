import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fetchGatewayCatalog, type GatewayMedia } from '../api';
import { uploadGatewayMedia } from '../mediaGateway';
import { Empty } from '../components/States';
import Icon from '../components/Icon';
import { useTitle } from '../title';

const ALLOWED_TYPES = new Set([
  'video/mp4', 'video/webm', 'video/ogg',
  'audio/mp4', 'audio/mpeg', 'audio/ogg', 'audio/webm',
]);
const MAX_UPLOAD_BYTES = 90 * 1024 * 1024;

function sizeLabel(bytes: number) {
  if (bytes >= 1024 ** 3) return (bytes / 1024 ** 3).toFixed(1) + ' GB';
  if (bytes >= 1024 ** 2) return (bytes / 1024 ** 2).toFixed(1) + ' MB';
  return Math.max(1, Math.round(bytes / 1024)) + ' KB';
}

export default function MediaLibrary() {
  const [items, setItems] = useState<GatewayMedia[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mediaId, setMediaId] = useState('');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [token, setToken] = useState('');
  const [license, setLicense] = useState<'owned' | 'licensed'>('owned');
  const [licenseReference, setLicenseReference] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);
  useTitle('Medios propios');

  async function reloadCatalog() {
    const data = await fetchGatewayCatalog();
    setItems(data);
    setError('');
  }

  useEffect(() => {
    let live = true;
    fetchGatewayCatalog().then((data) => { if (live) setItems(data); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, []);

  async function submitUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setUploadError('');
    setUploadMessage('');
    const id = mediaId.trim();
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(id)) {
      setUploadError('El ID solo puede contener letras, números, guiones y guiones bajos (máximo 80 caracteres).');
      return;
    }
    if (!file) { setUploadError('Selecciona un archivo multimedia.'); return; }
    if (!ALLOWED_TYPES.has(file.type.toLowerCase())) {
      setUploadError('Formato no admitido o no reconocido. Usa MP4, WebM u Ogg.');
      return;
    }
    if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
      setUploadError('El archivo debe pesar más de 0 bytes y no superar 90 MiB.');
      return;
    }
    if (!token.trim()) { setUploadError('Introduce el token de carga del Gateway.'); return; }
    if (license === 'licensed' && !licenseReference.trim()) {
      setUploadError('Para contenido licenciado debes indicar la referencia del permiso o licencia.');
      return;
    }

    setUploading(true);
    try {
      const result = await uploadGatewayMedia({
        id, file, token, title, creator, license,
        licenseReference: license === 'licensed' ? licenseReference : undefined,
        visibility,
      });
      await reloadCatalog();
      setUploadMessage(result.replicas.degraded
        ? 'Archivo recibido, pero la réplica quedó incompleta. No lo consideres protegido hasta corregir la réplica.'
        : 'Archivo cargado y confirmado en los dos buckets.');
      setToken('');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : 'No se pudo cargar el archivo.');
    } finally {
      setUploading(false);
    }
  }

  return <div className="page media-library">
    <div className="page-head-row"><h1 className="page-title"><Icon name="library" size={24} /> Medios propios</h1></div>
    <p className="sub">Archivos alojados en TodoTube. Solo se publican vídeos propios o con licencia expresa para su distribución.</p>

    <section className="media-upload" aria-labelledby="media-upload-title">
      <div className="media-upload-head">
        <div><h2 id="media-upload-title">Cargar un archivo</h2><p>MP4, WebM u Ogg · máximo 90 MiB · la carga se replica en R2.</p></div>
        <Icon name="upload" size={22} />
      </div>
      <form className="media-upload-form" onSubmit={submitUpload}>
        <label className="media-field media-field-wide">ID del medio
          <input value={mediaId} onChange={(e) => setMediaId(e.target.value)} placeholder="Ej. YTVideoId11 o mi-video-001" maxLength={80} required disabled={uploading} />
          <small>Para asociar una copia autorizada a una ficha existente, usa exactamente su ID. Así la ficha /ver/ID podrá usar el reproductor de TodoTube.</small>
        </label>
        <label className="media-field">Título
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título del vídeo" maxLength={180} required disabled={uploading} />
        </label>
        <label className="media-field">Creador
          <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Nombre del creador" maxLength={120} required disabled={uploading} />
        </label>
        <label className="media-field">Tipo de licencia
          <select value={license} onChange={(e) => setLicense(e.target.value as 'owned' | 'licensed')} disabled={uploading}>
            <option value="owned">Contenido propio</option>
            <option value="licensed">Contenido licenciado</option>
          </select>
        </label>
        <label className="media-field">Visibilidad
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')} disabled={uploading}>
            <option value="public">Público</option>
            <option value="private">Privado</option>
          </select>
        </label>
        {license === 'licensed' && <label className="media-field media-field-wide">Referencia de licencia o permiso
          <input value={licenseReference} onChange={(e) => setLicenseReference(e.target.value)} placeholder="URL, contrato o referencia verificable" maxLength={300} required disabled={uploading} />
        </label>}
        <label className="media-field media-field-wide">Archivo
          <input ref={fileInput} type="file" accept="video/mp4,video/webm,video/ogg,audio/mp4,audio/mpeg,audio/ogg,audio/webm" onChange={(e) => setFile(e.target.files?.[0] ?? null)} required disabled={uploading} />
          {file && <small>{file.name} · {sizeLabel(file.size)}</small>}
        </label>
        <label className="media-field media-field-wide">Token de carga del Gateway
          <input type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Se usa solo para esta solicitud; no se guarda" required disabled={uploading} />
          <small>El token no se incluye en el código de la web ni se guarda en el navegador.</small>
        </label>
        {uploadError && <p className="media-upload-error" role="alert">{uploadError}</p>}
        {uploadMessage && <p className={uploadMessage.startsWith('Archivo cargado') ? 'media-upload-success' : 'media-upload-error'} role="status">{uploadMessage}</p>}
        <div className="media-upload-actions">
          <button className="btn primary" type="submit" disabled={uploading}>{uploading ? 'Cargando archivo…' : 'Subir y replicar'}</button>
          <span>Se comprobará la escritura en ambos orígenes antes de confirmar.</span>
        </div>
      </form>
    </section>

    <div className="media-library-list-head"><h2>Biblioteca</h2><span>{items.length} {items.length === 1 ? 'archivo' : 'archivos'}</span></div>
    {loading && <p className="note">Conectando con el Gateway multimedia…</p>}
    {error && <div className="media-state" role="status"><b>No se pudo consultar el Gateway</b><p>{error}</p><button className="btn" type="button" onClick={() => { setLoading(true); reloadCatalog().catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setLoading(false)); }}>Reintentar</button></div>}
    {!loading && !error && items.length === 0 && <Empty title="Todavía no hay medios publicados"><p>Cuando cargues un archivo propio o con licencia, aparecerá aquí.</p></Empty>}
    {items.length > 0 && <div className="media-list">{items.map((m) => <Link className="media-row" key={m.id} to={'/medios/' + encodeURIComponent(m.id)}>
      <span className="media-icon"><Icon name="play" size={28} /></span>
      <span className="media-info"><b>{m.title}</b><span>{m.creator} · {m.license === 'owned' ? 'Contenido propio' : 'Contenido licenciado'} · {m.id}</span></span>
      <span className="media-size">{sizeLabel(m.size)}</span>
    </Link>)}</div>}
  </div>;
}