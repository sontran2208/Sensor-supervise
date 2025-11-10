// Google Maps API types
declare global {
  interface Window {
    google: {
      maps: {
        Map: any;
        MapTypeId: any;
        Marker: any;
        InfoWindow: any;
        Polyline: any;
        LatLngBounds: any;
        geometry: any;
      };
    };
  }
}

export {};
