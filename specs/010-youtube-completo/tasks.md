# YouTube completo: tareas

Ordenadas por dependencia. IDs globales (ver `specs/002-mvp/tasks.md` para las transversales).

- T-008 · [técnico] Spike: NewPipeExtractor en un proyecto Media3/Compose (reproducción, PoToken, SABR) y tiempo hasta el primer fotograma → CA10.1
- T-024 · [android] **`:connector:youtube`** (flavor `full`): búsqueda, canal, lista, vídeo, comentarios; NewPipeExtractor; streams a Media3 → CA10.1–10.3 · depende de T-008
- T-024b · [android] SponsorBlock, DeArrow y RYD → CA10.4
- T-024c · [android] Detector de roturas + actualizador in-app firmado (GitHub Releases) → CA10.6
- T-024d · [ci] Test que impide que la build `play` contenga `:connector:youtube` → CA10.8
- T-024e · [android] Importar Google Takeout CSV, NewPipe y PipePipe → CA10.5
