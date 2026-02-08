import { useState } from 'react';
import type { CountryOrder, StateOrder, RegionOrder } from '../services/ownerStatsService';

interface SimpleMapProps {
  countries?: CountryOrder[];
  states?: StateOrder[];
  regions?: RegionOrder[];
  type: 'country' | 'state' | 'region';
  onSelect?: (item: CountryOrder | StateOrder | RegionOrder | null) => void;
  selectedItem?: CountryOrder | StateOrder | RegionOrder | null;
}

export default function SimpleMap({
  countries,
  states,
  regions,
  type,
  onSelect,
  selectedItem,
}: SimpleMapProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Get data based on type
  const getData = () => {
    if (type === 'country' && countries) return countries;
    if (type === 'state' && states) return states;
    if (type === 'region' && regions) return regions;
    return [];
  };

  const data = getData();

  // Get max value for intensity calculation
  const maxValue = Math.max(...data.map((item) => item.orderCount), 1);

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

  // Check if item is selected
  const isSelected = (item: CountryOrder | StateOrder | RegionOrder) => {
    if (!selectedItem) return false;
    return getItemId(item) === getItemId(selectedItem);
  };

  // Handle click
  const handleClick = (item: CountryOrder | StateOrder | RegionOrder) => {
    if (onSelect) {
      if (isSelected(item)) {
        onSelect(null);
      } else {
        onSelect(item);
      }
    }
  };

  // Get color based on type and intensity
  const getColor = (item: CountryOrder | StateOrder | RegionOrder, isHover: boolean) => {
    const intensity = (item.orderCount / maxValue) * 100;
    
    if (isSelected(item)) {
      return type === 'country' ? 'bg-purple-600' : type === 'state' ? 'bg-indigo-600' : 'bg-green-600';
    }
    
    if (isHover) {
      return type === 'country' ? 'bg-purple-400' : type === 'state' ? 'bg-indigo-400' : 'bg-green-400';
    }

    if (type === 'country') {
      return intensity > 70 ? 'bg-purple-300' : intensity > 40 ? 'bg-purple-200' : 'bg-purple-100';
    }
    if (type === 'state') {
      return intensity > 70 ? 'bg-indigo-300' : intensity > 40 ? 'bg-indigo-200' : 'bg-indigo-100';
    }
    return intensity > 70 ? 'bg-green-300' : intensity > 40 ? 'bg-green-200' : 'bg-green-100';
  };

  if (data.length === 0) {
    return (
      <div className="w-full h-[500px] rounded-xl border-2 border-gray-200 flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">لا توجد بيانات للعرض</p>
      </div>
    );
  }

  return (
    <div className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 p-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {data.map((item) => {
          const itemId = getItemId(item);
          const itemName = getItemName(item);
          const isHover = hoveredItem === itemId;
          const selected = isSelected(item);

          return (
            <div
              key={itemId}
              onClick={() => handleClick(item)}
              onMouseEnter={() => setHoveredItem(itemId)}
              onMouseLeave={() => setHoveredItem(null)}
              className={`
                relative rounded-lg p-4 border-2 transition-all duration-200 cursor-pointer
                ${selected ? 'border-indigo-600 shadow-lg scale-105' : 'border-gray-300 shadow-sm hover:shadow-md'}
                ${getColor(item, isHover)}
                ${selected ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}
              `}
            >
              {selected && (
                <div className="absolute top-2 right-2">
                  <div className="w-3 h-3 bg-indigo-600 rounded-full"></div>
                </div>
              )}
              
              <div className="text-center">
                <h3 className="font-bold text-gray-900 mb-2 text-sm">{itemName}</h3>
                <div className="space-y-1">
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">الطلبات:</span> {item.orderCount}
                  </p>
                  <p className="text-xs text-gray-700">
                    <span className="font-semibold">الإيرادات:</span>{' '}
                    {item.revenue.toLocaleString('ar-IQ')} دينار
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
