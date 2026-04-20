import { useEffect, useRef, useState, memo } from 'react';
import type { GpsDoc } from '../hooks/useGps';
import { FaMapMarkerAlt } from 'react-icons/fa';
import { HiExclamationCircle } from 'react-icons/hi';

interface Props {
  data: GpsDoc[];
}

// Declare Leaflet types
declare global {
  interface Window {
    L: any;
  }
}

function FreeGpsMap({ data }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const polylineRef = useRef<any>(null);
  const lastDataLengthRef = useRef<number>(0);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  const invalidateMapSize = () => {
    const map = mapInstanceRef.current;
    if (!map || typeof map.invalidateSize !== 'function') return;

    requestAnimationFrame(() => {
      map.invalidateSize();
      setTimeout(() => {
        if (mapInstanceRef.current?.invalidateSize) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);
    });
  };

  // Load Leaflet library
  useEffect(() => {
    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    // Load CSS
    const cssLink = document.createElement('link');
    cssLink.rel = 'stylesheet';
    cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    cssLink.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    cssLink.crossOrigin = '';
    document.head.appendChild(cssLink);

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Leaflet');
      setMapError('Failed to load map library');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script and CSS
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (cssLink.parentNode) {
        cssLink.parentNode.removeChild(cssLink);
      }
    };
  }, []);

  // Initialize map only once when Leaflet is loaded
  useEffect(() => {
    if (!isLeafletLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const latestPoint = data[0] || { latitude: 10.8231, longitude: 106.6297 };
      
      // Initialize map only once
      const map = window.L.map(mapRef.current).setView(
        [latestPoint.latitude, latestPoint.longitude], 
        15
      );

      // Add OpenStreetMap tiles
      window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      mapInstanceRef.current = map;
      setMapError(null);
      invalidateMapSize();
    } catch (error) {
      console.error('Error initializing Leaflet map:', error);
      setMapError('Failed to initialize map');
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.remove();
        } catch (error) {
          console.warn('Error removing map:', error);
        }
        mapInstanceRef.current = null;
        markersRef.current = [];
        polylineRef.current = null;
      }
    };
  }, [isLeafletLoaded, data.length > 0]);

  // ResizeObserver để detect khi container thay đổi kích thước
  useEffect(() => {
    if (!mapInstanceRef.current || !mapRef.current) return;

    const map = mapInstanceRef.current;
    const container = mapRef.current;
    const parent = container.parentElement;

    const resizeObserver = new ResizeObserver(() => {
      setTimeout(() => {
        if (map && map.invalidateSize) {
          map.invalidateSize();
        }
      }, 100);
    });

    resizeObserver.observe(container);
    if (parent) resizeObserver.observe(parent);

    const handleWindowResize = () => invalidateMapSize();
    const handleVisibilityChange = () => {
      if (!document.hidden) invalidateMapSize();
    };

    window.addEventListener('resize', handleWindowResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isLeafletLoaded]);

  // Update markers and polyline when data changes (without reinitializing map)
  useEffect(() => {
    if (!isLeafletLoaded || !mapInstanceRef.current || data.length === 0) return;

    const map = mapInstanceRef.current;
    const currentDataLength = data.length;
    
    // Only update if we have new data points
    if (currentDataLength <= lastDataLengthRef.current) {
      return;
    }

    try {
      // Remove old markers
      markersRef.current.forEach(marker => {
        map.removeLayer(marker);
      });
      markersRef.current = [];

      // Remove old polyline
      if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }

      // Add new markers for each GPS point
      data.forEach((point, index) => {
        // Xác định màu marker dựa trên mode
        let markerColor = 'blue'; // default
        if (point.mode === 'REAL') {
          markerColor = 'green';
        } else if (point.mode === 'SIMULATED') {
          markerColor = 'orange';
        }
        
        const marker = window.L.marker([point.latitude, point.longitude], {
          icon: window.L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${markerColor}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 0 2px ${markerColor}40;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })
        })
          .addTo(map)
          .bindPopup(`
            <div>
              <h3>GPS Point ${index + 1}</h3>
              <p><strong>Time:</strong> ${new Date(point.timestamp).toLocaleString()}</p>
              <p><strong>Latitude:</strong> ${point.latitude.toFixed(6)}</p>
              <p><strong>Longitude:</strong> ${point.longitude.toFixed(6)}</p>
              <p><strong>Mode:</strong> <span style="color: ${point.mode === 'REAL' ? 'green' : 'orange'}">${point.mode ?? 'UNKNOWN'}</span></p>
              ${point.altitude !== undefined ? `<p><strong>Altitude:</strong> ${point.altitude.toFixed(2)}m</p>` : ''}
              ${point.speed !== undefined ? `<p><strong>Speed:</strong> ${point.speed.toFixed(2)} km/h</p>` : ''}
              ${point.satellites !== undefined ? `<p><strong>Satellites:</strong> ${point.satellites}</p>` : ''}
              ${point.accuracy !== undefined ? `<p><strong>Accuracy:</strong> ${point.accuracy.toFixed(2)}m</p>` : ''}
            </div>
          `);
        
        markersRef.current.push(marker);
      });

      // Create new polyline to show path
      const pathCoordinates = data.map(point => [point.latitude, point.longitude]);
      polylineRef.current = window.L.polyline(pathCoordinates, {
        color: 'red',
        weight: 3,
        opacity: 0.7
      }).addTo(map);

      // Fit map to show all points (only if we have multiple points)
      if (markersRef.current.length > 1) {
        const group = new window.L.featureGroup(markersRef.current);
        map.fitBounds(group.getBounds().pad(0.1));
      } else if (markersRef.current.length === 1) {
        // Center on single point
        const latestPoint = data[0];
        map.setView([latestPoint.latitude, latestPoint.longitude], 15);
      }

      invalidateMapSize();

      lastDataLengthRef.current = currentDataLength;
    } catch (error) {
      console.error('Error updating map markers:', error);
    }
  }, [isLeafletLoaded, data]);

  if (data.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <FaMapMarkerAlt className="text-4xl mx-auto mb-2 text-gray-400" />
          <p>No GPS data available</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
        <div className="text-center text-red-600">
          <HiExclamationCircle className="text-4xl mx-auto mb-2 text-red-500" />
          <p>{mapError}</p>
        </div>
      </div>
    );
  }

  if (!isLeafletLoaded) {
    return (
      <div className="h-64 bg-blue-50 rounded-lg flex items-center justify-center border border-blue-200">
        <div className="text-center text-blue-600">
          <div className="text-4xl mb-2">⏳</div>
          <p>Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📍 GPS Map (Free)</h3>
        <div
          ref={mapRef}
          className="h-96 w-full rounded-lg border border-gray-300 overflow-hidden"
          style={{ zIndex: 0 }}
        />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data[0]?.latitude?.toFixed(6) || 'N/A'}
          </div>
          <div className="text-sm text-blue-800">Latest Latitude</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {data[0]?.longitude?.toFixed(6) || 'N/A'}
          </div>
          <div className="text-sm text-green-800">Latest Longitude</div>
        </div>
        <div className={`rounded-lg p-3 text-center ${
          data[0]?.mode === 'REAL' 
            ? 'bg-green-50' 
            : data[0]?.mode === 'SIMULATED'
            ? 'bg-yellow-50'
            : 'bg-gray-50'
        }`}>
          <div className={`text-2xl font-bold ${
            data[0]?.mode === 'REAL' 
              ? 'text-green-600' 
              : data[0]?.mode === 'SIMULATED'
              ? 'text-yellow-600'
              : 'text-gray-600'
          }`}>
            {data[0]?.mode === 'REAL' ? '🛰️' : data[0]?.mode === 'SIMULATED' ? '📍' : '❓'}
          </div>
          <div className={`text-sm ${
            data[0]?.mode === 'REAL' 
              ? 'text-green-800' 
              : data[0]?.mode === 'SIMULATED'
              ? 'text-yellow-800'
              : 'text-gray-800'
          }`}>
            {data[0]?.mode ?? 'UNKNOWN'}
          </div>
        </div>
        {data[0]?.altitude !== undefined && (
          <div className="bg-purple-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {data[0].altitude.toFixed(1)}m
            </div>
            <div className="text-sm text-purple-800">Altitude</div>
          </div>
        )}
        {data[0]?.speed !== undefined && (
          <div className="bg-orange-50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-orange-600">
              {data[0].speed.toFixed(1)} km/h
            </div>
            <div className="text-sm text-orange-800">Speed</div>
          </div>
        )}
      </div>
    </div>
  );
}

// Memoize component to prevent unnecessary rerenders when parent rerenders
// Return true = skip rerender, return false = rerender
export default memo(FreeGpsMap, (prevProps, nextProps) => {
  // Rerender if data length changes (new data points added)
  if (prevProps.data.length !== nextProps.data.length) return false;
  
  // Skip rerender if both are empty
  if (prevProps.data.length === 0 && nextProps.data.length === 0) return true;
  
  const prevLatest = prevProps.data[0];
  const nextLatest = nextProps.data[0];
  
  // If one is empty and other is not, rerender
  if (!prevLatest || !nextLatest) return false;
  
  // Skip rerender if latest point hasn't changed (same coordinates and timestamp)
  // This prevents rerender when data array reference changes but content is same
  return (
    prevLatest.latitude === nextLatest.latitude &&
    prevLatest.longitude === nextLatest.longitude &&
    prevLatest.timestamp === nextLatest.timestamp
  );
});