# Only two Noto Sans files are needed for PDFs (it has the rupee sign); copy them from
# the full font package instead of installing all of it.
FROM debian:trixie-slim AS fonts
RUN apt-get update && apt-get install -y --no-install-recommends fonts-noto-core && rm -rf /var/lib/apt/lists/*

FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# Pango and HarfBuzz are what WeasyPrint uses to lay out PDFs.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libpango-1.0-0 libpangoft2-1.0-0 libharfbuzz-subset0 fontconfig \
    && rm -rf /var/lib/apt/lists/*
COPY --from=fonts /usr/share/fonts/truetype/noto/NotoSans-Regular.ttf /usr/share/fonts/truetype/noto/NotoSans-Bold.ttf /usr/share/fonts/truetype/noto/
RUN fc-cache -f

WORKDIR /app
RUN useradd --create-home --uid 1000 vastu

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY seeds ./seeds
COPY app ./app

USER vastu
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips=*"]
