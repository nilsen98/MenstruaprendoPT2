FROM node:18
WORKDIR /server

COPY package*.json ./
RUN npm install

COPY . .

# ❌ Quitar esta línea que falla en build:
# RUN npx prisma generate

EXPOSE 3000
CMD ["npm", "start"]
