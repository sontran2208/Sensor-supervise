import { useEffect, useRef, useState } from 'react';
import type { GpsDoc } from '../hooks/useGps';

interface Props {
  data: GpsDoc[];
}

export default function GpsMap({ data }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const [mapError, setMapError] = useState<string | null>(null);

  const initializeMap = () => {
    if (!mapRef.current || !window.google || !mapRef.current.isConnected) return;

    try {
      const latestPoint = data[0];
      
      // Check if element is still in DOM
      if (!document.contains(mapRef.current)) {
        console.warn('Map element no longer in DOM');
        return;
      }

      const map = new window.google.maps.Map(mapRef.current, {
        zoom: 15,
        center: { lat: latestPoint.latitude, lng: latestPoint.longitude },
        mapTypeId: window.google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: false,
        gestureHandling: 'cooperative',
        clickableIcons: false,
      });

      mapInstanceRef.current = map;

      // Add markers for each GPS point
      const pathCoordinates = data.map(point => ({
        lat: point.latitude,
        lng: point.longitude,
      }));

      // Create polyline to show path
      const path = new window.google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: '#FF0000',
        strokeOpacity: 1.0,
        strokeWeight: 2,
      });

      path.setMap(map);

      // Add markers
      data.forEach((point, index) => {
        const marker = new window.google.maps.Marker({
          position: { lat: point.latitude, lng: point.longitude },
          map: map,
          title: `Point ${index + 1}`,
          label: `${index + 1}`,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `
            <div>
              <h3>GPS Point ${index + 1}</h3>
              <p><strong>Time:</strong> ${new Date(point.timestamp).toLocaleString()}</p>
              <p><strong>Latitude:</strong> ${point.latitude.toFixed(6)}</p>
              <p><strong>Longitude:</strong> ${point.longitude.toFixed(6)}</p>
              <p><strong>Altitude:</strong> ${point.altitude.toFixed(2)}m</p>
              <p><strong>Speed:</strong> ${point.speed.toFixed(2)} km/h</p>
              <p><strong>Satellites:</strong> ${point.satellites}</p>
              <p><strong>Accuracy:</strong> ${point.accuracy.toFixed(2)}m</p>
            </div>
          `,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });
      });

      // Fit map to show all points
      const bounds = new window.google.maps.LatLngBounds();
      pathCoordinates.forEach(coord => bounds.extend(coord));
      map.fitBounds(bounds);
      
      setMapError(null);
    } catch (error) {
      console.error('Error initializing Google Maps:', error);
      setMapError('Failed to initialize map');
    }
  };

  useEffect(() => {
    if (!mapRef.current || data.length === 0) return;

    // Add a delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (!mapRef.current || !mapRef.current.isConnected) return;

      // Load Google Maps API dynamically
      const loadGoogleMaps = () => {
        if (window.google && window.google.maps) {
          initializeMap();
        } else {
          const script = document.createElement('script');
          script.src = `https://maps.googleapis.com/maps/api/js?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&libraries=geometry`;
          script.onload = () => {
            // Add another small delay after script loads
            setTimeout(initializeMap, 50);
          };
          script.onerror = () => {
            console.error('Failed to load Google Maps API');
            setMapError('Failed to load Google Maps API - Check your API key');
          };
          document.head.appendChild(script);
        }
      };

      loadGoogleMaps();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
      if (mapInstanceRef.current) {
        mapInstanceRef.current = null;
      }
    };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-2">🗺️</div>
          <p>No GPS data available</p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="h-64 bg-red-50 rounded-lg flex items-center justify-center border border-red-200">
        <div className="text-center text-red-600">
          <div className="text-4xl mb-2">⚠️</div>
          <p>{mapError}</p>
          <p className="text-sm mt-2">
            {mapError.includes('API') ? 'Please check your Google Maps API key in .env file' : 'Please try again'}
          </p>
        </div>
      </div>
    );
  }

  return (
    
    <div className="space-y-4">
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-800 mb-3">📍 GPS Map</h3>
        <div ref={mapRef} className="h-96 w-full rounded-lg border border-gray-300" />
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-blue-600">
            {data[0]?.latitude.toFixed(6)}
          </div>
          <div className="text-sm text-blue-800">Latest Latitude</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-green-600">
            {data[0]?.longitude.toFixed(6)}
          </div>
          <div className="text-sm text-green-800">Latest Longitude</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {data[0]?.altitude.toFixed(1)}m
          </div>
          <div className="text-sm text-purple-800">Altitude</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-orange-600">
            {data[0]?.speed.toFixed(1)} km/h
          </div>
          <div className="text-sm text-orange-800">Speed</div>
        </div>
      </div>
    </div>
  );
}