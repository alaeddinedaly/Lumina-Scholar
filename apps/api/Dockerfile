FROM node:20-alpine

# Install missing OS dependencies for Prisma and native extensions like bcrypt
RUN apk add --no-cache openssl libc6-compat make g++ python3

WORKDIR /app

# Copy essentially the entire required ecosystem
COPY package*.json ./
COPY frontend/package*.json ./frontend/
COPY apps/api ./apps/api
COPY packages ./packages

# Install dependencies (this will install linux-native bcrypt)
RUN cd apps/api && npm install

# Generate Prisma Client & Build
WORKDIR /app/apps/api
RUN npx prisma generate
RUN npm run build

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push --accept-data-loss && npm run start:prod"]
