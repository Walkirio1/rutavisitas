FROM node:22-alpine
WORKDIR /app
COPY server.js panel.html estadisticas.html ./
ENV PORT=8787 DB=/datos/verific.db NODE_NO_WARNINGS=1
VOLUME /datos
EXPOSE 8787
CMD ["node","server.js"]
