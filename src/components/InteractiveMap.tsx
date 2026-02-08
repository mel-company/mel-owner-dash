import { useState, useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { CountryOrder, StateOrder, RegionOrder } from '../services/ownerStatsService';

// Fix for default marker icons in Leaflet with Webpack/Vite
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface InteractiveMapProps {
  countries?: CountryOrder[];
  states?: StateOrder[];
  regions?: RegionOrder[];
  type: 'country' | 'state' | 'region';
  onSelect?: (item: CountryOrder | StateOrder | RegionOrder | null) => void;
  selectedItem?: CountryOrder | StateOrder | RegionOrder | null;
}

// Component to handle map bounds and zoom
function MapController({ bounds }: { bounds: LatLngBounds | null }) {
  const map = useMap();

  useEffect(() => {
    if (!bounds) return;

    // Delay to ensure map and GeoJSON are fully loaded
    const timer = setTimeout(() => {
      map.fitBounds(bounds, { padding: [50, 50] });
    }, 200);

    return () => clearTimeout(timer);
  }, [bounds, map]);

  return null;
}

// Simple GeoJSON for Iraq - using proper [lng, lat] format
const iraqGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        name: 'العراق',
        countryId: 'iraq',
        countryName: 'العراق',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [38.8, 29.1], // [lng, lat] - جنوب غرب
            [48.6, 29.1], // [lng, lat] - جنوب شرق
            [48.6, 37.4], // [lng, lat] - شمال شرق
            [38.8, 37.4], // [lng, lat] - شمال غرب
            [38.8, 29.1], // [lng, lat] - إغلاق المضلع
          ],
        ],
      },
    },
  ],
};

// States GeoJSON (simplified - replace with actual data)
const iraqStatesGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        name: 'بغداد',
        stateId: 'baghdad',
        stateName: 'بغداد',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [44.2, 33.2], // [lng, lat] - بغداد
            [44.5, 33.2],
            [44.5, 33.4],
            [44.2, 33.4],
            [44.2, 33.2],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        name: 'البصرة',
        stateId: 'basra',
        stateName: 'البصرة',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [47.7, 30.4], // [lng, lat] - البصرة
            [48.0, 30.4],
            [48.0, 30.6],
            [47.7, 30.6],
            [47.7, 30.4],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        name: 'كربلاء',
        stateId: 'karbala',
        stateName: 'كربلاء',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [43.9, 32.5], // [lng, lat] - كربلاء
            [44.2, 32.5],
            [44.2, 32.7],
            [43.9, 32.7],
            [43.9, 32.5],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        name: 'النجف',
        stateId: 'najaf',
        stateName: 'النجف',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [44.3, 31.9], // [lng, lat] - النجف
            [44.6, 31.9],
            [44.6, 32.1],
            [44.3, 32.1],
            [44.3, 31.9],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        name: 'الأنبار',
        stateId: 'anbar',
        stateName: 'الأنبار',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [41.0, 33.3], // [lng, lat] - الأنبار
            [42.0, 33.3],
            [42.0, 34.5],
            [41.0, 34.5],
            [41.0, 33.3],
          ],
        ],
      },
    },
  ],
};

// Regions GeoJSON (simplified - replace with actual data)
const iraqRegionsGeoJSON = {
  type: 'FeatureCollection' as const,
  features: [
    {
      type: 'Feature' as const,
      properties: {
        name: 'البلدية',
        regionId: 'baladiya',
        regionName: 'البلدية',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [44.2, 32.5], // [lng, lat] - البلدية
            [44.3, 32.5],
            [44.3, 32.6],
            [44.2, 32.6],
            [44.2, 32.5],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        name: 'ابي الخصيب',
        regionId: 'abi-khasib',
        regionName: 'ابي الخصيب',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [47.7, 30.4], // [lng, lat] - ابي الخصيب
            [47.8, 30.4],
            [47.8, 30.5],
            [47.7, 30.5],
            [47.7, 30.4],
          ],
        ],
      },
    },
    {
      type: 'Feature' as const,
      properties: {
        name: 'المشراق الجديد',
        regionId: 'mashraq-jadid',
        regionName: 'المشراق الجديد',
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [
          [
            [44.3, 32.3], // [lng, lat] - المشراق الجديد
            [44.4, 32.3],
            [44.4, 32.4],
            [44.3, 32.4],
            [44.3, 32.3],
          ],
        ],
      },
    },
  ],
};

export default function InteractiveMap({
  countries,
  states,
  regions,
  type,
  onSelect,
  selectedItem,
}: InteractiveMapProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Debug: Log when component renders
  console.log('🗺️ InteractiveMap rendered', {
    type,
    hasCountries: !!countries?.length,
    hasStates: !!states?.length,
    hasRegions: !!regions?.length,
    selectedItem: selectedItem ? 'yes' : 'no'
  });

  // Merge GeoJSON with actual data
  const geoJSONData = useMemo(() => {
    if (type === 'country' && countries) {
      return {
        ...iraqGeoJSON,
        features: iraqGeoJSON.features.map((feature) => {
          const countryData = countries.find(
            (c) => c.countryId === feature.properties.countryId || c.countryName === feature.properties.name
          );
          return {
            ...feature,
            properties: {
              ...feature.properties,
              countryId: countryData?.countryId || feature.properties.countryId,
              countryName: countryData?.countryName || feature.properties.name,
              orderCount: countryData?.orderCount || 0,
              revenue: countryData?.revenue || 0,
            },
          };
        }),
      };
    }

    if (type === 'state' && states) {
      return {
        ...iraqStatesGeoJSON,
        features: iraqStatesGeoJSON.features.map((feature) => {
          const stateData = states.find(
            (s) => s.stateId === feature.properties.stateId || s.stateName === feature.properties.name
          );
          return {
            ...feature,
            properties: {
              ...feature.properties,
              stateId: stateData?.stateId || feature.properties.stateId,
              stateName: stateData?.stateName || feature.properties.name,
              orderCount: stateData?.orderCount || 0,
              revenue: stateData?.revenue || 0,
            },
          };
        }),
      };
    }

    if (type === 'region' && regions) {
      return {
        ...iraqRegionsGeoJSON,
        features: iraqRegionsGeoJSON.features.map((feature) => {
          const regionData = regions.find(
            (r) => r.regionId === feature.properties.regionId || r.regionName === feature.properties.name
          );
          return {
            ...feature,
            properties: {
              ...feature.properties,
              regionId: regionData?.regionId || feature.properties.regionId,
              regionName: regionData?.regionName || feature.properties.name,
              orderCount: regionData?.orderCount || 0,
              revenue: regionData?.revenue || 0,
            },
          };
        }),
      };
    }

    if (type === 'country') return iraqGeoJSON;
    if (type === 'state') return iraqStatesGeoJSON;
    return iraqRegionsGeoJSON;
  }, [countries, states, regions, type]);

  // Get style for each feature
  const getFeatureStyle = (feature: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const isSelected =
      (type === 'country' &&
        selectedItem &&
        'countryId' in selectedItem &&
        selectedItem.countryId === feature.properties.countryId) ||
      (type === 'state' &&
        selectedItem &&
        'stateId' in selectedItem &&
        selectedItem.stateId === feature.properties.stateId) ||
      (type === 'region' &&
        selectedItem &&
        'regionId' in selectedItem &&
        selectedItem.regionId === feature.properties.regionId);

    const isHovered =
      (type === 'country' && hoveredItem === feature.properties.countryId) ||
      (type === 'state' && hoveredItem === feature.properties.stateId) ||
      (type === 'region' && hoveredItem === feature.properties.regionId);

    const maxValue =
      type === 'country'
        ? Math.max(...(countries?.map((c) => c.orderCount) || [0]), 1)
        : type === 'state'
          ? Math.max(...(states?.map((s) => s.orderCount) || [0]), 1)
          : Math.max(...(regions?.map((r) => r.orderCount) || [0]), 1);

    const currentValue = feature.properties.orderCount || 0;
    const intensity = maxValue > 0 ? (currentValue / maxValue) * 100 : 0;

    return {
      fillColor: isSelected
        ? '#4F46E5'
        : isHovered
          ? '#6366F1'
          : type === 'country'
            ? `rgba(139, 92, 246, ${0.3 + intensity / 100 * 0.5})`
            : type === 'state'
              ? `rgba(99, 102, 241, ${0.3 + intensity / 100 * 0.5})`
              : `rgba(16, 185, 129, ${0.3 + intensity / 100 * 0.5})`,
      weight: isSelected ? 3 : isHovered ? 2 : 1,
      color: isSelected ? '#312E81' : '#4B5563',
      fillOpacity: isSelected ? 0.8 : isHovered ? 0.7 : 0.5,
      dashArray: isSelected ? '5, 5' : undefined,
    };
  };

  // Handle click on feature
  const handleFeatureClick = (feature: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
    if (type === 'country') {
      const countryData = countries?.find(
        (c) => c.countryId === feature.properties.countryId || c.countryName === feature.properties.countryName
      );
      if (countryData && onSelect) {
        // Don't toggle - always select to drill down
        onSelect(countryData);
      }
    } else if (type === 'state') {
      const stateData = states?.find(
        (s) => s.stateId === feature.properties.stateId || s.stateName === feature.properties.stateName
      );
      if (stateData && onSelect) {
        // Don't toggle - always select to drill down
        onSelect(stateData);
      }
    } else if (type === 'region') {
      const regionData = regions?.find(
        (r) => r.regionId === feature.properties.regionId || r.regionName === feature.properties.regionName
      );
      if (regionData && onSelect) {
        // Toggle selection for regions (final level)
        if (selectedItem && 'regionId' in selectedItem && selectedItem.regionId === regionData.regionId) {
          onSelect(null);
        } else {
          onSelect(regionData);
        }
      }
    }
  };

  // Calculate bounds - coordinates are [lng, lat]
  const bounds = useMemo(() => {
    if (geoJSONData.features.length === 0) return null;

    const coordinates = geoJSONData.features.flatMap((f: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      if (f.geometry.type === 'Polygon') {
        return f.geometry.coordinates[0];
      }
      return [];
    });

    if (coordinates.length === 0) return null;

    // Coordinates are [lng, lat] format
    const lngs = coordinates.map((c: number[]) => c[0]); // longitude
    const lats = coordinates.map((c: number[]) => c[1]); // latitude

    return new LatLngBounds(
      [Math.min(...lats), Math.min(...lngs)], // [minLat, minLng]
      [Math.max(...lats), Math.max(...lngs)]  // [maxLat, maxLng]
    );
  }, [geoJSONData]);

  // Check if we're in browser
  if (typeof window === 'undefined') {
    return (
      <div className="w-full h-[500px] rounded-xl border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري تحميل الخريطة...</p>
        </div>
      </div>
    );
  }

  // Test: Simple div first to verify component renders
  return (
    <div
      id="map-container"
      style={{
        height: '500px',
        width: '100%',
        position: 'relative',
        backgroundColor: '#e5e7eb'
      }}
      className="rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg"
    >
      {/* Test: Uncomment this to test if component renders */}
      {/* <div style={{ height: 500, background: 'red', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        MAP TEST - If you see this, component is rendering
      </div> */}

      <MapContainer
        center={[33.0, 44.0]}
        zoom={6}
        style={{ height: '500px', width: '100%' }}
        scrollWheelZoom={true}
        whenReady={() => {
          console.log('✅ Map ready!');
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {geoJSONData.features.length > 0 && (
          <GeoJSON
            data={geoJSONData as any} // eslint-disable-line @typescript-eslint/no-explicit-any
            style={getFeatureStyle}
            onEachFeature={(feature, layer) => {
              layer.on({
                click: () => {
                  console.log('📍 Feature clicked:', feature.properties);
                  handleFeatureClick(feature);
                },
                mouseover: () => {
                  const id =
                    type === 'country'
                      ? feature.properties.countryId
                      : type === 'state'
                        ? feature.properties.stateId
                        : feature.properties.regionId;
                  setHoveredItem(id);
                  (layer as any).setStyle(getFeatureStyle(feature)); // eslint-disable-line @typescript-eslint/no-explicit-any
                },
                mouseout: () => {
                  setHoveredItem(null);
                  (layer as any).setStyle(getFeatureStyle(feature)); // eslint-disable-line @typescript-eslint/no-explicit-any
                },
              });

              // Tooltip
              const name =
                type === 'country'
                  ? feature.properties.countryName
                  : type === 'state'
                    ? feature.properties.stateName
                    : feature.properties.regionName || feature.properties.name;
              const orderCount = feature.properties.orderCount || 0;
              const revenue = feature.properties.revenue || 0;

              (layer as any).bindTooltip( // eslint-disable-line @typescript-eslint/no-explicit-any
                `<div style="text-align: right; direction: rtl;">
                  <strong>${name}</strong><br/>
                  الطلبات: ${orderCount}<br/>
                  الإيرادات: ${revenue.toLocaleString('ar-IQ')} دينار
                </div>`,
                { direction: 'top' }
              );
            }}
          />
        )}

        {bounds && <MapController bounds={bounds} />}
      </MapContainer>
    </div>
  );
}
