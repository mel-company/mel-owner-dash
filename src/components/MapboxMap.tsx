import { useState, useMemo } from 'react';
import Map, { Marker, Popup } from 'react-map-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { CountryOrder, StateOrder, RegionOrder } from '../services/ownerStatsService';

interface MapboxMapProps {
  countries?: CountryOrder[];
  states?: StateOrder[];
  regions?: RegionOrder[];
  type: 'country' | 'state' | 'region';
  onSelect?: (item: CountryOrder | StateOrder | RegionOrder | null) => void;
  selectedItem?: CountryOrder | StateOrder | RegionOrder | null;
}

// Mapbox token - يمكنك إضافته في .env كـ VITE_MAPBOX_TOKEN
// للحصول على token مجاني: https://account.mapbox.com/access-tokens/
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNsY2h6d2J0YjBkM2EzcW1xY2J0Y2J0Y2IifQ.example';

// Coordinates for Iraq regions (centers for markers)
const iraqCenters: Record<string, { lat: number; lng: number }> = {
  // Countries
  iraq: { lat: 33.0, lng: 44.0 },

  // States
  baghdad: { lat: 33.3, lng: 44.4 },
  basra: { lat: 30.5, lng: 47.8 },
  karbala: { lat: 32.6, lng: 44.0 },
  najaf: { lat: 32.0, lng: 44.3 },
  anbar: { lat: 33.4, lng: 43.3 },

  // Regions
  baladiya: { lat: 33.3, lng: 44.4 },
  'abi-khasib': { lat: 30.5, lng: 47.8 },
  'mashraq-jadid': { lat: 33.3, lng: 44.4 },
};

export default function MapboxMap({
  countries,
  states,
  regions,
  type,
  onSelect,
  selectedItem,
}: MapboxMapProps) {
  const [popupInfo, setPopupInfo] = useState<{
    item: CountryOrder | StateOrder | RegionOrder;
    lng: number;
    lat: number;
  } | null>(null);
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Get data based on type
  const getData = () => {
    if (type === 'country' && countries) return countries;
    if (type === 'state' && states) return states;
    if (type === 'region' && regions) return regions;
    return [];
  };

  const data = getData();

  // Get item ID
  const getItemId = (item: CountryOrder | StateOrder | RegionOrder) => {
    if ('countryId' in item) return item.countryId;
    if ('stateId' in item) return item.stateId;
    return item.regionId;
  };

  // Get item name
  const getItemName = (item: CountryOrder | StateOrder | RegionOrder) => {
    if ('countryName' in item) return item.countryName;
    if ('stateName' in item) return item.stateName;
    return item.regionName;
  };

  // Get coordinates for item
  const getItemCoordinates = (item: CountryOrder | StateOrder | RegionOrder) => {
    const id = getItemId(item);
    return iraqCenters[id] || { lat: 33.0, lng: 44.0 };
  };

  // Check if item is selected
  const isSelected = (item: CountryOrder | StateOrder | RegionOrder) => {
    if (!selectedItem) return false;
    return getItemId(item) === getItemId(selectedItem);
  };

  // Get max value for intensity
  const maxValue = useMemo(() => {
    if (data.length === 0) return 1;
    return Math.max(...data.map((item) => item.orderCount), 1);
  }, [data]);

  // Calculate initial view state
  const initialViewState = useMemo(() => {
    if (data.length === 0) {
      return {
        latitude: 33.0,
        longitude: 44.0,
        zoom: 6,
      };
    }

    // Calculate center from all items
    const coords = data.map((item) => {
      const id = getItemId(item);
      return iraqCenters[id] || { lat: 33.0, lng: 44.0 };
    });
    const avgLat = coords.reduce((sum, c) => sum + c.lat, 0) / coords.length;
    const avgLng = coords.reduce((sum, c) => sum + c.lng, 0) / coords.length;

    return {
      latitude: avgLat,
      longitude: avgLng,
      zoom: type === 'country' ? 6 : type === 'state' ? 7 : 8,
    };
  }, [data, type]);

  // Handle marker click
  const handleMarkerClick = (item: CountryOrder | StateOrder | RegionOrder) => {
    const coords = getItemCoordinates(item);
    setPopupInfo({ item, lng: coords.lng, lat: coords.lat });

    if (onSelect) {
      if (isSelected(item)) {
        onSelect(null);
        setPopupInfo(null);
      } else {
        onSelect(item);
      }
    }
  };

  // Get marker color based on intensity
  const getMarkerColor = (item: CountryOrder | StateOrder | RegionOrder) => {
    if (maxValue === 0) return '#E9D5FF';
    const intensity = (item.orderCount / maxValue) * 100;

    if (isSelected(item)) {
      return type === 'country' ? '#8B5CF6' : type === 'state' ? '#6366F1' : '#10B981';
    }

    if (hoveredItem === getItemId(item)) {
      return type === 'country' ? '#A78BFA' : type === 'state' ? '#818CF8' : '#34D399';
    }

    if (type === 'country') {
      return intensity > 70 ? '#C084FC' : intensity > 40 ? '#D8B4FE' : '#E9D5FF';
    }
    if (type === 'state') {
      return intensity > 70 ? '#818CF8' : intensity > 40 ? '#A5B4FC' : '#C7D2FE';
    }
    return intensity > 70 ? '#34D399' : intensity > 40 ? '#6EE7B7' : '#A7F3D0';
  };

  // Get marker size
  const getMarkerSize = (item: CountryOrder | StateOrder | RegionOrder) => {
    if (maxValue === 0) {
      const baseSize = type === 'country' ? 20 : type === 'state' ? 16 : 12;
      return baseSize;
    }
    const intensity = (item.orderCount / maxValue) * 100;
    const baseSize = type === 'country' ? 20 : type === 'state' ? 16 : 12;
    return baseSize + (intensity / 100) * 10;
  };

  // Check if Mapbox token is valid
  const hasValidToken = MAPBOX_TOKEN && !MAPBOX_TOKEN.includes('example');

  if (data.length === 0) {
    return (
      <div className="w-full h-[500px] rounded-xl border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">لا توجد بيانات للعرض</p>
      </div>
    );
  }

  if (!hasValidToken) {
    return (
      <div className="w-full h-[500px] rounded-xl border-2 border-red-200 flex flex-col items-center justify-center bg-red-50 p-6">
        <p className="text-red-600 font-semibold mb-2">⚠️ خطأ في تحميل الخريطة</p>
        <p className="text-red-500 text-sm text-center">
          Mapbox token غير موجود. يرجى إضافة VITE_MAPBOX_TOKEN في ملف .env
        </p>
        <a
          href="https://account.mapbox.com/access-tokens/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 text-blue-600 hover:underline text-sm"
        >
          احصل على Mapbox token مجاني →
        </a>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg relative">
      <Map
        mapboxAccessToken={MAPBOX_TOKEN}
        initialViewState={initialViewState}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/light-v11"
        onError={(e) => {
          console.error('Mapbox error:', e);
        }}
      >
        {data.map((item) => {
          const coords = getItemCoordinates(item);
          const itemId = getItemId(item);
          const itemName = getItemName(item);
          const isHovered = hoveredItem === itemId;
          const selected = isSelected(item);

          return (
            <Marker
              key={itemId}
              latitude={coords.lat}
              longitude={coords.lng}
              anchor="center"
            >
              <div
                onClick={() => handleMarkerClick(item)}
                onMouseEnter={() => setHoveredItem(itemId)}
                onMouseLeave={() => setHoveredItem(null)}
                style={{
                  width: getMarkerSize(item),
                  height: getMarkerSize(item),
                  backgroundColor: getMarkerColor(item),
                  borderRadius: '50%',
                  border: selected ? '3px solid #312E81' : isHovered ? '2px solid #4B5563' : '1px solid #9CA3AF',
                  cursor: 'pointer',
                  boxShadow: selected
                    ? '0 0 0 4px rgba(79, 70, 229, 0.3)'
                    : isHovered
                      ? '0 2px 8px rgba(0,0,0,0.3)'
                      : '0 1px 4px rgba(0,0,0,0.2)',
                  transition: 'all 0.2s',
                  transform: selected ? 'scale(1.2)' : isHovered ? 'scale(1.1)' : 'scale(1)',
                }}
                title={itemName}
              />
            </Marker>
          );
        })}

        {popupInfo && (
          <Popup
            latitude={popupInfo.lat}
            longitude={popupInfo.lng}
            anchor="bottom"
            onClose={() => setPopupInfo(null)}
            closeButton={true}
            closeOnClick={false}
          >
            <div className="p-2 text-right" style={{ direction: 'rtl' }}>
              <h3 className="font-bold text-gray-900 mb-2">
                {getItemName(popupInfo.item)}
              </h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-semibold">الطلبات:</span>{' '}
                  {popupInfo.item.orderCount}
                </p>
                <p>
                  <span className="font-semibold">الإيرادات:</span>{' '}
                  {popupInfo.item.revenue.toLocaleString('ar-IQ')} دينار
                </p>
                <p>
                  <span className="font-semibold">متوسط قيمة الطلب:</span>{' '}
                  {popupInfo.item.orderCount > 0
                    ? (
                      popupInfo.item.revenue / popupInfo.item.orderCount
                    ).toLocaleString('ar-IQ', { maximumFractionDigits: 0 })
                    : 0}{' '}
                  دينار
                </p>
              </div>
            </div>
          </Popup>
        )}
      </Map>
    </div>
  );
}
