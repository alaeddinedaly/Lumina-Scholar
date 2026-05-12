FROM node:20-alpine

WORKDIR /app

# Copy packages block
COPY frontend/package*.json ./frontend/
COPY packages ./packages

# Install frontend dependencies
RUN cd frontend && npm install

# Copy source
COPY frontend ./frontend

WORKDIR /app/frontend
# Ensure any NEXT_PUBLIC vars are available at build time if passed (though NextJS often embeds them)
# For runtime, next start reads the environment.
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
