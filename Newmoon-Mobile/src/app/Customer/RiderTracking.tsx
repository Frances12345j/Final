import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, AppState, StatusBar, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Ionicons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import api, { listenToOrder } from '../../../lib/api';

interface RiderInfo {
  id: number;
  name: string;
  phone?: string;
}

function toLat(val: any): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

function toLng(val: any): number | null {
  if (val === null || val === undefined) return null;
  const n = Number(val);
  return isNaN(n) ? null : n;
}

const GENERATE_MAP_HTML = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=2.0, user-scalable=yes">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.7.1/dist/leaflet.css"/>
  <script src="https://unpkg.com/leaflet@1.7.1/dist/leaflet.js"></script>
  <style>
    *{margin:0;padding:0}
    html,body{height:100%;width:100%;overflow:hidden;background:#f3f4f6}
    #map{height:100%;width:100%;background:#f3f4f6}
    .route-line{stroke:#1E40AF;stroke-width:8;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 2px 4px rgba(30,64,175,0.2))}
    .rider-dot{position:relative;width:22px;height:22px;background:#2563EB;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)}
    .rider-dot::before,.rider-dot::after{content:"";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:22px;height:22px;border-radius:50%;background:rgba(37,99,235,0.5);z-index:-1}
    .rider-dot::before{animation:heartbeat 1.6s ease-out infinite}
    .rider-dot::after{animation:heartbeat 1.6s ease-out infinite;animation-delay:0.8s}
    @keyframes heartbeat{0%{opacity:0.7;transform:translate(-50%,-50%) scale(1)}70%,100%{opacity:0;transform:translate(-50%,-50%) scale(2.8)}}
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
  (function(){
    function initMap(){
      try{
        var map=L.map('map',{zoomControl:false,attributionControl:true}).setView([14.56,121.02],15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'\\u00a9 OpenStreetMap'}).addTo(map);
        window.map=map;
        window.riderMarker=null;
        window.destMarker=null;
        window.activeRoute=null;
        window.riderPos=null;
        window.destPos=null;
        window.__autoFollow=true;
        window.__fullRouteCoords=null;
        window.__routeCacheKey=null;
        window.__isDragging=false;
        window.__pendingUpdate=null;
        window.routeRetryCount=0;
        window.maxRouteRetries=3;
        window.lastRouteFetchTime=0;
        window.minRouteFetchInterval=2000;

        var riderIcon=L.divIcon({
          html:'<div class="rider-dot"></div>',
          iconSize:[30,30],iconAnchor:[15,15],className:''
        });

        function makeDestIcon(){
          return L.divIcon({
            html:'<div style="width:24px;height:24px;background:#EF4444;border-radius:50%;border:3px solid white;box-shadow:0 0 15px rgba(239,68,68,0.4);display:flex;align-items:center;justify-content:center"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></div>',
            iconSize:[24,24],iconAnchor:[12,12],className:''
          });
        }

        function findNearestPointOnRoute(routeCoords,lat,lng){
          if(!routeCoords||routeCoords.length<2)return null;
          var minDist=Infinity,nearestPoint=null,nearestIndex=0;
          for(var i=0;i<routeCoords.length;i++){
            var p=routeCoords[i];
            var d=Math.pow(p[0]-lat,2)+Math.pow(p[1]-lng,2);
            if(d<minDist){minDist=d;nearestPoint=p;nearestIndex=i;}
          }
          return{point:nearestPoint,index:nearestIndex};
        }

        function showRoute(coords){
          if(!coords||coords.length<2){
            if(window.riderPos&&window.destPos)coords=[[window.riderPos.lat,window.riderPos.lng],[window.destPos.lat,window.destPos.lng]];
            else return;
          }
          if(window.activeRoute)window.map.removeLayer(window.activeRoute);
          window.activeRoute=L.polyline(coords,{color:'#1E40AF',weight:8,opacity:0.85,smoothFactor:1,lineJoin:'round',lineCap:'round',className:'route-line'}).addTo(map);
        }

        function updateRouteDisplay(currentIndex){
          var fullCoords=window.__fullRouteCoords;
          if(!fullCoords||fullCoords.length===0)return;
          var remaining=fullCoords.slice(currentIndex);
          if(remaining.length<2){
            if(window.riderPos&&window.destPos)remaining=[[window.riderPos.lat,window.riderPos.lng],[window.destPos.lat,window.destPos.lng]];
            else return;
          }
          if(window.activeRoute)window.map.removeLayer(window.activeRoute);
          window.activeRoute=L.polyline(remaining,{color:'#1E40AF',weight:8,opacity:0.85,smoothFactor:1,lineJoin:'round',lineCap:'round',className:'route-line'}).addTo(map);
        }

        function fetchRouteWithRetry(fromLat,fromLng,toLat,toLng,retryCount){
          retryCount=retryCount||0;
          var endpoints=['https://router.project-osrm.org/route/v1/driving/','https://routing.openstreetmap.de/routed-car/route/v1/driving/'];
          var endpoint=endpoints[retryCount%endpoints.length];
          var url=endpoint+fromLng+','+fromLat+';'+toLng+','+toLat+'?geometries=geojson&overview=full&alternatives=true&steps=true';
          fetch(url).then(function(r){if(!r.ok)throw new Error('HTTP '+r.status);return r.json();})
            .then(function(data){
              window.routeRetryCount=0;
              if(data.code==='Ok'&&data.routes&&data.routes.length>0){
                var best=data.routes[0];
                for(var i=1;i<data.routes.length;i++){if(data.routes[i].distance<best.distance)best=data.routes[i];}
                var coords=best.geometry.coordinates.map(function(c){return[c[1],c[0]];});
                window.__fullRouteCoords=coords;
                window.__routeCacheKey=fromLat+','+fromLng+'|'+toLat+','+toLng;
                window.lastRouteFetchTime=Date.now();
                if(!window.__isDragging)showRoute(coords);
                else window.__pendingUpdate=coords;
              }else if(retryCount<window.maxRouteRetries){
                setTimeout(function(){fetchRouteWithRetry(fromLat,fromLng,toLat,toLng,retryCount+1);},1000);
              }else fallbackRoute(fromLat,fromLng,toLat,toLng);
            }).catch(function(){
              if(retryCount<window.maxRouteRetries){
                setTimeout(function(){fetchRouteWithRetry(fromLat,fromLng,toLat,toLng,retryCount+1);},1000);
              }else fallbackRoute(fromLat,fromLng,toLat,toLng);
            });
        }

        function fallbackRoute(fromLat,fromLng,toLat,toLng){
          var coords=[],steps=20;
          for(var i=0;i<=steps;i++){
            var t=i/steps;
            var offset=Math.sin(t*Math.PI)*0.001;
            coords.push([fromLat+(toLat-fromLat)*t+offset,fromLng+(toLng-fromLng)*t]);
          }
          window.__fullRouteCoords=coords;
          if(!window.__isDragging)showRoute(coords);
          else window.__pendingUpdate=coords;
        }

        function fetchRoute(fromLat,fromLng,toLat,toLng){
          var now=Date.now();
          if(now-window.lastRouteFetchTime<window.minRouteFetchInterval)return;
          fetchRouteWithRetry(fromLat,fromLng,toLat,toLng,0);
        }

        map.on('dragstart',function(){window.__isDragging=true;window.__autoFollow=false;});
        map.on('dragend',function(){
          window.__isDragging=false;
          if(window.__pendingUpdate){showRoute(window.__pendingUpdate);window.__pendingUpdate=null;}
        });

        window.__enableFollow=function(){
          window.__autoFollow=true;window.__isDragging=false;
          if(window.riderPos)map.setView([window.riderPos.lat,window.riderPos.lng],map.getZoom(),{animate:true});
        };

        window.__lastPanLat=null;
        window.__lastPanLng=null;
        window.__panThreshold=0.00005;

        function haversineMeters(lat1,lng1,lat2,lng2){
          var R=6371000;
          var dLat=(lat2-lat1)*Math.PI/180;
          var dLng=(lng2-lng1)*Math.PI/180;
          var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)*Math.sin(dLng/2);
          return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
        }

        window.__destinationAddress='';

        function riderPopupContent(){
          var addr=window.__destinationAddress||'Delivery destination';
          return '<b style="font-size:14px">Rider</b><br>'+
                 '<span style="color:#2563EB;font-weight:bold;font-size:12px">On the way to destination</span><br>'+
                 '<span style="color:#374151;font-size:12px">'+(addr||'')+'</span>';
        }
        function refreshRiderPopup(){
          if(window.riderMarker)window.riderMarker.setPopupContent(riderPopupContent());
        }

        var animRaf=0;
        function animateMarkerTo(targetLat,targetLng){
          var m=window.riderMarker;
          if(!m)return;
          var from=m.getLatLng();
          if(animRaf)cancelAnimationFrame(animRaf);
          if(from.lat===targetLat&&from.lng===targetLng)return;
          var start=null;
          var dur=1000;
          function step(ts){
            if(start===null)start=ts;
            var t=Math.min(1,(ts-start)/dur);
            var e=0.5-0.5*Math.cos(Math.PI*t);
            m.setLatLng([from.lat+(targetLat-from.lat)*e,from.lng+(targetLng-from.lng)*e]);
            if(t<1)animRaf=requestAnimationFrame(step);
          }
          animRaf=requestAnimationFrame(step);
        }

        window.__updateRider=function(lat,lng){
          if(!map)return;
          var shouldPan=function(newLat,newLng){
            if(!window.__autoFollow||window.__isDragging)return false;
            if(window.__lastPanLat===null)return true;
            return haversineMeters(window.__lastPanLat,window.__lastPanLng,newLat,newLng)>5;
          };
          var doPan=function(newLat,newLng){
            window.__lastPanLat=newLat;
            window.__lastPanLng=newLng;
            map.panTo([newLat,newLng],{animate:true,duration:0.5});
          };
          if(window.__fullRouteCoords&&window.__fullRouteCoords.length>=2){
            var nearest=findNearestPointOnRoute(window.__fullRouteCoords,lat,lng);
            if(nearest&&nearest.point){
              window.riderPos={lat:nearest.point[0],lng:nearest.point[1]};
              if(window.riderMarker)animateMarkerTo(nearest.point[0],nearest.point[1]);
              else window.riderMarker=L.marker([nearest.point[0],nearest.point[1]],{icon:riderIcon}).addTo(map).bindPopup(riderPopupContent());
              if(shouldPan(nearest.point[0],nearest.point[1]))doPan(nearest.point[0],nearest.point[1]);
              if(!window.__isDragging)updateRouteDisplay(nearest.index);
              return;
            }
          }
          window.riderPos={lat:lat,lng:lng};
          if(window.riderMarker)animateMarkerTo(lat,lng);
          else window.riderMarker=L.marker([lat,lng],{icon:riderIcon}).addTo(map).bindPopup(riderPopupContent());
          if(shouldPan(lat,lng))doPan(lat,lng);
          if(window.destPos&&!window.__isDragging){
            var key=lat+','+lng+'|'+window.destPos.lat+','+window.destPos.lng;
            if(window.__routeCacheKey!==key)fetchRoute(lat,lng,window.destPos.lat,window.destPos.lng);
          }
        };

        window.__initDestination=function(lat,lng,address){
          window.destPos={lat:lat,lng:lng};
          window.__destinationAddress=address||'';
          if(window.destMarker)window.destMarker.setLatLng([lat,lng]);
          else window.destMarker=L.marker([lat,lng],{icon:makeDestIcon()}).addTo(map);
          refreshRiderPopup();
          if(window.riderPos&&!window.__isDragging){
            var key=window.riderPos.lat+','+window.riderPos.lng+'|'+lat+','+lng;
            if(window.__routeCacheKey!==key)fetchRoute(window.riderPos.lat,window.riderPos.lng,lat,lng);
          }
        };

        window.__fitBounds=function(){
          var bounds=[];
          if(window.riderPos)bounds.push([window.riderPos.lat,window.riderPos.lng]);
          if(window.destPos)bounds.push([window.destPos.lat,window.destPos.lng]);
          if(bounds.length>0)map.fitBounds(bounds,{padding:[60,60],maxZoom:16});
        };

        setTimeout(function(){map.invalidateSize();},300);
        setTimeout(function(){map.invalidateSize();},600);
      }catch(e){console.error('Map init error:',e);}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initMap);
    else initMap();
  })();
  </script>
</body>
</html>`;

export default function RiderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const webViewRef = useRef<WebView>(null);
  const [rider, setRider] = useState<RiderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hasLocation, setHasLocation] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [orderStatus, setOrderStatus] = useState('picked_up');
  const noId = !id;

  const [cardCollapsed, setCardCollapsed] = useState(false);
  const cardAnim = useRef(new Animated.Value(0)).current;

  const toggleCard = () => {
    const next = !cardCollapsed;
    Animated.timing(cardAnim, {
      toValue: next ? 1 : 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
    setCardCollapsed(next);
  };

  const mapHtmlRef = useRef<string>(GENERATE_MAP_HTML());
  const mapReadyRef = useRef(false);
  const riderRef = useRef<RiderInfo | null>(null);
  const liveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const orderLoadedRef = useRef(false);
  const lastOrderFetchRef = useRef(0);
  const riderPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const destPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const [riderSpeed, setRiderSpeed] = useState(0);
  const lastSpeedFixRef = useRef<{ lat: number; lng: number; ts: number } | null>(null);
  const smoothedSpeedRef = useRef(0);
  const speedDecayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const haversineMeters = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const updateSpeed = (lat: number, lng: number) => {
    const now = Date.now();
    const prev = lastSpeedFixRef.current;
    lastSpeedFixRef.current = { lat, lng, ts: now };

    if (speedDecayTimerRef.current) clearTimeout(speedDecayTimerRef.current);
    speedDecayTimerRef.current = setTimeout(() => setRiderSpeed(0), 5000);

    if (!prev) return;
    const dtSec = (now - prev.ts) / 1000;
    if (dtSec <= 0 || dtSec > 20) return;
    const distM = haversineMeters(prev.lat, prev.lng, lat, lng);
    if (distM < 3) {
      smoothedSpeedRef.current = 0;
      setRiderSpeed(0);
      return;
    }
    const kmh = (distM / dtSec) * 3.6;
    if (smoothedSpeedRef.current === 0) {
      smoothedSpeedRef.current = kmh;
    } else {
      smoothedSpeedRef.current = smoothedSpeedRef.current * 0.6 + kmh * 0.4;
    }
    setRiderSpeed(Math.min(999, Math.round(smoothedSpeedRef.current)));
  };

  const smoothCoords = (lat: number, lng: number) => {
    const prev = riderPosRef.current;
    if (!prev) return { lat, lng };
    const dr = Math.sqrt(Math.pow(lat - prev.lat, 2) + Math.pow(lng - prev.lng, 2));
    const meters = dr * 111320;
    let alpha: number;
    if (meters < 3) {
      alpha = 0.15;
    } else if (meters < 10) {
      alpha = 0.4;
    } else if (meters < 25) {
      alpha = 0.7;
    } else {
      alpha = 1;
    }
    return {
      lat: prev.lat + (lat - prev.lat) * alpha,
      lng: prev.lng + (lng - prev.lng) * alpha,
    };
  };

  const pushRiderPos = (lat: number, lng: number) => {
    const smoothed = smoothCoords(lat, lng);
    riderPosRef.current = smoothed;
    updateSpeed(smoothed.lat, smoothed.lng);
    if (mapReadyRef.current) {
      injectJS(`if(window.__updateRider){window.__updateRider(${smoothed.lat},${smoothed.lng})}true;`);
      if (destPosRef.current) {
        injectJS(`if(window.__initDestination){window.__initDestination(${destPosRef.current.lat},${destPosRef.current.lng},'${(deliveryAddress || '').replace(/'/g, "\\'")}')}true;`);
      }
    }
    return smoothed;
  };

  const injectJS = (js: string) => {
    webViewRef.current?.injectJavaScript(js);
  };

  const fetchOrderDetails = async () => {
    if (!id) return;
    try {
      const orderRes = await api.get(`/customer/orders/${id}`);
      const addr = orderRes.data.delivery_address || '';
      setDeliveryAddress(addr);
      if (orderRes.data.status) {
        setOrderStatus(orderRes.data.status);
      }
      const dLat = toLat(orderRes.data.delivery_latitude);
      const dLng = toLng(orderRes.data.delivery_longitude);
      if (dLat && dLng) {
        destPosRef.current = { lat: dLat, lng: dLng };
        if (mapReadyRef.current) {
          injectJS(`if(window.__initDestination){window.__initDestination(${dLat},${dLng},'${addr.replace(/'/g, "\\'")}')}true;`);
          if (riderPosRef.current) {
            setTimeout(() => {
              injectJS(`if(window.__fitBounds){window.__fitBounds()}true;`);
            }, 500);
          }
        }
      }
    } catch {}
  };

  const fetchTracking = async () => {
    if (!id) return;
    try {
      const trackRes = await api.get(`/customer/orders/${id}/track`);
      const riderData = trackRes.data.rider;

      if (riderData && (!riderRef.current || riderData.id !== riderRef.current.id)) {
        riderRef.current = riderData;
        setRider(riderData);
      }

      const lat = toLat(trackRes.data.latitude);
      const lng = toLng(trackRes.data.longitude);
      setUpdatedAt(trackRes.data.updated_at);

      if (lat !== null && lng !== null) {
        if (!hasLocation) setHasLocation(true);
        setIsLive(true);

        if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
        liveTimerRef.current = setTimeout(() => setIsLive(false), 5000);

        const smoothed = pushRiderPos(lat, lng);

        if (mapReadyRef.current && destPosRef.current) {
          injectJS(`if(window.__initDestination){window.__initDestination(${destPosRef.current.lat},${destPosRef.current.lng},'${(deliveryAddress || '').replace(/'/g, "\\'")}')}true;`);
        }
      }

      const now = Date.now();
      if (now - lastOrderFetchRef.current > 10000) {
        lastOrderFetchRef.current = now;
        await fetchOrderDetails();
      }
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError('No rider assigned yet');
      } else if (!hasLocation) {
        setError('Unable to load tracking');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    fetchTracking();

    const pollInterval = setInterval(() => {
      fetchTracking();
    }, 2500);

    const unsubscribe = listenToOrder(id, '.RiderLocationUpdated', (data) => {
      const lat = toLat(data?.latitude);
      const lng = toLng(data?.longitude);
      if (data?.updated_at) setUpdatedAt(data.updated_at);

      if (lat !== null && lng !== null) {
        if (!hasLocation) setHasLocation(true);
        setIsLive(true);

        if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
        liveTimerRef.current = setTimeout(() => setIsLive(false), 5000);

        const smoothed = pushRiderPos(lat, lng);

        if (mapReadyRef.current && destPosRef.current) {
          injectJS(`if(window.__initDestination){window.__initDestination(${destPosRef.current.lat},${destPosRef.current.lng},'${(deliveryAddress || '').replace(/'/g, "\\'")}')}true;`);
        }
      }
    });

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchTracking();
    });

    return () => {
      unsubscribe();
      sub.remove();
      clearInterval(pollInterval);
      if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
      if (speedDecayTimerRef.current) clearTimeout(speedDecayTimerRef.current);
    };
  }, [id]);

  useEffect(() => {
    if (!mapReadyRef.current || !webViewRef.current) return;
    injectJS('if(window.__enableFollow){window.__enableFollow()}true;');
    if (destPosRef.current && riderPosRef.current) {
      injectJS(`if(window.__initDestination){window.__initDestination(${destPosRef.current.lat},${destPosRef.current.lng},'${(deliveryAddress || '').replace(/'/g, "\\'")}')}true;`);
      setTimeout(() => {
        injectJS(`if(window.__fitBounds){window.__fitBounds()}true;`);
      }, 500);
    }
  }, [mapLoaded]);

  const formatTime = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'delivered': return 'Delivered';
      case 'cancelled': return 'Cancelled';
      case 'out_for_delivery': return 'On the way';
      case 'picked_up': return 'Rider picked up';
      case 'ready': return 'Ready for pickup';
      case 'preparing': return 'Preparing your food';
      default: return 'Confirmed';
    }
  };

  if (noId) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED]">
        <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />
        <View className="px-5 pt-4 pb-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#7C2D12" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-[#7C2D12]">Track Order</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-[#FFF1E6] rounded-full items-center justify-center mb-4">
            <Ionicons name="locate-outline" size={40} color="#F97316" />
          </View>
          <Text className="text-[#7C2D12] text-xl font-extrabold">No Order Selected</Text>
          <Text className="text-[#7C2D12]/60 text-center mt-2 leading-5">
            Go to an active order in your history to track your rider in real-time.
          </Text>
          <TouchableOpacity
            className="mt-8 bg-[#F97316] px-8 py-3.5 rounded-2xl"
            style={{
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
            }}
            onPress={() => router.back()}
          >
            <Text className="text-white font-extrabold text-base">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED] justify-center items-center">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="text-[#7C2D12]/60 mt-4 text-sm font-medium">Fetching delivery details...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-[#FFF7ED]">
        <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />
        <View className="px-5 pt-4 pb-3 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={24} color="#7C2D12" />
          </TouchableOpacity>
          <Text className="text-xl font-extrabold text-[#7C2D12]">Track Order</Text>
        </View>
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-20 h-20 bg-[#FFF1E6] rounded-full items-center justify-center mb-4">
            <Ionicons name="person-outline" size={40} color="#F97316" />
          </View>
          <Text className="text-[#7C2D12] text-xl font-extrabold">No Rider Assigned</Text>
          <Text className="text-[#7C2D12]/60 text-center mt-2 leading-5">
            We are currently looking for a rider. You will be notified as soon as one accepts your order.
          </Text>
          <TouchableOpacity
            className="mt-8 bg-[#F97316] px-8 py-3.5 rounded-2xl"
            style={{
              shadowColor: '#F97316',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 4,
            }}
            onPress={() => router.back()}
          >
            <Text className="text-white font-extrabold text-base">Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]">
      <StatusBar barStyle="dark-content" backgroundColor="#FFF7ED" />

      {/* Full-screen map (rendered FIRST so header floats above) */}
      <View className="absolute inset-0">
        {!mapLoaded && (
          <View className="absolute inset-0 items-center justify-center bg-[#FFF1E6] z-10">
            <ActivityIndicator size="large" color="#F97316" />
          </View>
        )}

        <WebView
          ref={webViewRef}
          style={{ flex: 1, backgroundColor: '#f3f4f6' }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          mixedContentMode="always"
          source={{ html: mapHtmlRef.current }}
          scrollEnabled={false}
          bounces={false}
          overScrollMode="never"
          onLoadEnd={() => {
            setMapLoaded(true);
            mapReadyRef.current = true;
            setTimeout(() => {
              injectJS('if(window.map){window.map.invalidateSize()}true;');
              fetchOrderDetails();
              if (riderPosRef.current) {
                injectJS(`if(window.__updateRider){window.__updateRider(${riderPosRef.current.lat},${riderPosRef.current.lng})}true;`);
                if (destPosRef.current) {
                  setTimeout(() => {
                    injectJS(`if(window.__fitBounds){window.__fitBounds()}true;`);
                  }, 800);
                }
              }
            }, 300);
          }}
        />

        {!hasLocation && mapLoaded && (
          <View className="absolute inset-0 bg-[#FFF7ED]/95 items-center justify-center">
            <ActivityIndicator size="large" color="#F97316" />
            <Text className="text-[#7C2D12] mt-4 text-base font-extrabold">Waiting for signal...</Text>
            <Text className="text-[#7C2D12]/60 text-sm mt-1 text-center px-8 leading-5">
              The rider's location will update automatically once they start moving.
            </Text>
          </View>
        )}
      </View>

      {/* Floating back button only (top-left, tap-friendly) */}
      <TouchableOpacity
        onPress={() => router.back()}
        activeOpacity={0.85}
        className="absolute w-12 h-12 rounded-full bg-white items-center justify-center"
        style={{
          top: 56,
          left: 20,
          zIndex: 30,
          shadowColor: '#7C2D12',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 10,
          elevation: 8,
        }}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#7C2D12" />
      </TouchableOpacity>

      {/* Re-center button floating on map */}
      <TouchableOpacity
        className="absolute right-5 bg-white rounded-full px-4 py-2.5 flex-row items-center"
        style={{
          bottom: 24,
          zIndex: 20,
          shadowColor: '#7C2D12',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 10,
          elevation: 5,
        }}
        onPress={() => injectJS('if(window.__enableFollow){window.__enableFollow()}true;')}
        activeOpacity={0.85}
      >
        <Ionicons name="locate" size={16} color="#F97316" />
        <Text className="text-[#7C2D12] text-xs font-extrabold ml-2">Re-center</Text>
      </TouchableOpacity>

      {/* Bottom info card (collapsible via Animated) */}
      <Animated.View
        className="absolute bottom-0 left-0 right-0"
        style={{
          paddingHorizontal: 16,
          paddingBottom: 24,
          zIndex: 20,
          opacity: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: [
            {
              translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }),
            },
          ],
        }}
        pointerEvents={cardCollapsed ? 'none' : 'auto'}
      >
        <View
          className="bg-white rounded-3xl p-5"
          style={{
            shadowColor: '#7C2D12',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 8,
          }}
        >
          {/* Status pill + collapse toggle */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center bg-green-50 rounded-full px-3 py-1.5">
              <View className="w-2 h-2 rounded-full bg-green-500 mr-2" />
              <Text className="text-green-700 text-[12px] font-extrabold">
                {getStatusLabel(orderStatus)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={toggleCard}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              className="p-1"
            >
              <Ionicons name="chevron-down-circle-outline" size={22} color="#A8A29E" />
            </TouchableOpacity>
          </View>

          {/* ETA */}
          <View className="mt-4">
            <Text className="text-[#7C2D12]/60 text-[11px] font-bold uppercase tracking-wider">
              Arriving in
            </Text>
            <Text className="text-[#7C2D12] text-3xl font-extrabold mt-1">
              15–20 <Text className="text-[#7C2D12]/60 text-xl font-bold">min</Text>
            </Text>
          </View>

          {/* Divider */}
          <View className="h-px bg-[#FFF1E6] my-4" />

          {/* Rider info */}
          {rider ? (
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-[#FFF1E6] items-center justify-center">
                <FontAwesome5 name="motorcycle" size={20} color="#F97316" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[#7C2D12] font-extrabold text-[15px]">{rider.name}</Text>
                <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">NewMoon Rider</Text>
              </View>
              {riderSpeed > 0 && (
                <View className="bg-[#FFF1E6] rounded-full px-2.5 py-1">
                  <Text className="text-[#F97316] text-[11px] font-extrabold">
                    {riderSpeed} km/h
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View className="flex-row items-center">
              <View className="w-12 h-12 rounded-full bg-[#FFF1E6] items-center justify-center">
                <FontAwesome5 name="motorcycle" size={20} color="#F97316" />
              </View>
              <View className="ml-3 flex-1">
                <Text className="text-[#7C2D12] font-extrabold text-[15px]">Assigning rider...</Text>
                <Text className="text-[#7C2D12]/60 text-[12px] mt-0.5">Please wait</Text>
              </View>
            </View>
          )}

          {/* Call button */}
          {rider?.phone && (
            <TouchableOpacity
              className="mt-4 bg-[#F97316] rounded-2xl py-3.5 flex-row items-center justify-center"
              style={{
                shadowColor: '#F97316',
                shadowOffset: { width: 0, height: 6 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 4,
              }}
              onPress={() => Linking.openURL(`tel:${rider.phone}`)}
              activeOpacity={0.85}
            >
              <Ionicons name="call" size={18} color="#FFFFFF" />
              <Text className="text-white font-extrabold text-[14px] ml-2">
                Call Rider
              </Text>
            </TouchableOpacity>
          )}

          {/* Updated timestamp */}
          <Text className="text-center text-[#7C2D12]/40 text-[10px] font-medium mt-3">
            Updated {formatTime(updatedAt)}
          </Text>
        </View>
      </Animated.View>

      {/* Floating restore button when card is collapsed */}
      {cardCollapsed && (
        <View style={{ position: 'absolute', bottom: 24, left: 0, right: 0, alignItems: 'center', zIndex: 6 }}>
          <TouchableOpacity
            onPress={toggleCard}
            activeOpacity={0.85}
            className="bg-white rounded-full px-5 py-2.5 flex-row items-center"
            style={{
              shadowColor: '#7C2D12',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <Ionicons name="chevron-up" size={16} color="#F97316" />
            <Text className="text-[#F97316] text-xs font-extrabold ml-1.5">Show Status</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}