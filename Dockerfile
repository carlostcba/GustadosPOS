# Imagen base
FROM node:20-alpine as build

# Crear y usar el directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto de los archivos
COPY . .

# Exponer el puerto (ajustalo si tu app usa otro)
EXPOSE 5173

# Comando para correr la app
CMD ["npm", "run", "dev"]

