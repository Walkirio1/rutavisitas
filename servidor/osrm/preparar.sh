#!/bin/sh
# Prepara el mapa de calles para optimizar rutas (se hace UNA vez; después se actualiza cuando quieras).
# Uso:   sh osrm/preparar.sh            (Gran Rosario)
#        BBOX="-61.0,-33.3,-60.3,-32.6" sh osrm/preparar.sh     (otra zona: oeste,sur,este,norte)
set -e
DATOS="${DATOS_DIR:-./datos}"; BBOX="${BBOX:--61.0,-33.3,-60.3,-32.6}"
mkdir -p "$DATOS/osrm"; cd "$DATOS/osrm"
[ -f argentina.osm.pbf ] || curl -L -o argentina.osm.pbf https://download.geofabrik.de/south-america/argentina-latest.osm.pbf
echo "Recortando la zona..."
docker run --rm -v "$PWD:/data" iboates/osmium extract --bbox "$BBOX" /data/argentina.osm.pbf -o /data/zona.osm.pbf --overwrite
echo "Armando el mapa de calles..."
OSRM="docker run --rm -v $PWD:/data ghcr.io/project-osrm/osrm-backend"
$OSRM osrm-extract -p /opt/car.lua /data/zona.osm.pbf
$OSRM osrm-partition /data/zona.osrm
$OSRM osrm-customize /data/zona.osrm
rm -f zona.osm.pbf
echo "Listo. Ahora:  docker compose --profile calles up -d"
