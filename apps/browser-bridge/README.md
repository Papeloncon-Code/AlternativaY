# TodoTube Bridge

Extensión Manifest V3 que habilita al reproductor web propio de TodoTube a realizar las
solicitudes necesarias al proveedor de vídeo desde el navegador del usuario.

## Compilar

```bash
npm ci
npm run type-check
npm run build
```

La carpeta compilada para cargar como extensión es esta carpeta completa: debe contener
`manifest.json`, `rules.json` y `dist/`.

## Instalar en Chrome / Edge

1. Descarga el paquete compilado de TodoTube Bridge.
2. Descomprime el archivo en una carpeta local.
3. Abre `chrome://extensions` o `edge://extensions`.
4. Activa el modo desarrollador.
5. Selecciona «Cargar descomprimida» y elige la carpeta.
6. Recarga TodoTube.

La extensión solo inyecta código en el dominio de TodoTube y en localhost para desarrollo.
El proceso de proxy solo acepta destinos HTTPS de YouTube/Google Video, Google APIs,
YTImg y GGPHT. No acepta URLs arbitrarias.

## Créditos y licencia

El puente está basado en `ytc-bridge` de LuanRT, con licencia MIT. Se han adaptado
permisos, dominios de ejecución, validación de destinos y manejo de cancelación para
TodoTube. Se conserva el aviso de copyright y la licencia MIT en `LICENSE`.
