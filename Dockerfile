FROM node:20-alpine AS frontend-build

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install --no-audit --fund=false
COPY frontend/ ./
RUN npm run build

FROM python:3.11-slim

WORKDIR /app
COPY backend/ ./backend/
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

RUN pip install --no-cache-dir -r backend/requirements.txt

EXPOSE 8000
WORKDIR /app/backend
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
