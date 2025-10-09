# Realtime Server (Socket.IO)

Microservizio Socket.IO per lavagne realtime.

## Deploy veloce (Railway/Render/Fly)
- Build Docker con il Dockerfile incluso
- Esporre la porta 4001
- Variabili d'ambiente consigliate:
  - `PORT` (default 4001)
  - `CORS_ORIGIN` (es. `https://tuo-dominio.vercel.app`)

### Render (senza Docker)
1. Collega la repo su Render e scegli "Blueprint" usando il file `render.yaml` in root.
2. Render creerà un servizio Web Node con `rootDir: realtime-server` e healthcheck `/`.
3. Imposta `CORS_ORIGIN=https://recuperiamo.vercel.app` (o il tuo dominio Vercel).
4. Deploy → prendi l'URL pubblico generato e impostalo su Vercel in `NEXT_PUBLIC_SOCKET_URL`.

## URL
- Socket path: `/socket.io`
- Esempio endpoint: `https://realtime.tuo-dominio/socket.io`

## App Web
- Impostare su Vercel `NEXT_PUBLIC_SOCKET_URL=https://realtime.tuo-dominio`
- In sviluppo locale, la webapp continuerà a usare `/api/socketio` se `NEXT_PUBLIC_SOCKET_URL` non è definita.
