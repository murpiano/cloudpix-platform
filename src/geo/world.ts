import type { MultiLineString, MultiPolygon } from 'geojson';
import { merge, mesh } from 'topojson-client';
import type {
  GeometryCollection,
  MultiPolygon as TopoMultiPolygon,
  Polygon as TopoPolygon,
  Topology,
} from 'topojson-specification';

export interface EarthGeo {
  land: MultiPolygon;
  borders: MultiLineString;
}

/** public/demo/countries-110m.json (world-atlas). */
export type WorldTopology = Topology<{ countries: GeometryCollection }>;

const isArea = (geometry: { type: string | null }): geometry is TopoPolygon | TopoMultiPolygon =>
  geometry.type === 'Polygon' || geometry.type === 'MultiPolygon';

export const earthFromTopology = (topology: WorldTopology): EarthGeo => {
  const countries = topology.objects.countries;
  return {
    land: merge(topology, countries.geometries.filter(isArea)),
    borders: mesh(topology, countries, (a, b) => a !== b),
  };
};
