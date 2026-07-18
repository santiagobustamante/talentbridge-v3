export const environment = {
  production: true,
  // Placeholders hasta tener las URLs públicas reales de Railway (Fase 4 del plan
  // de deploy) -- se actualizan antes del build de producción definitivo.
  // apiUrl: api-gateway (los otros 8 servicios de negocio quedan solo en red
  // privada de Railway, el frontend nunca les habla directo).
  // wsUrl: chat-service tiene que tener su PROPIO dominio público -- el chat va
  // por WebSocket directo desde el navegador (chat-socket.service.ts), no pasa
  // por el proxy fetch() del gateway, así que no puede quedar solo en red interna
  // como los demás.
  apiUrl: 'https://REEMPLAZAR-CON-URL-DE-API-GATEWAY.up.railway.app/api',
  wsUrl: 'https://REEMPLAZAR-CON-URL-DE-CHAT-SERVICE.up.railway.app',
  // portfolio-service también necesita dominio público propio: la subida de CV
  // (cv.service.ts) le pega directo, bypasea el gateway.
  cvUploadUrl: 'https://REEMPLAZAR-CON-URL-DE-PORTFOLIO-SERVICE.up.railway.app',
};
