import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { X } from 'lucide-react';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

function ClickHandler({ setPos }: any) {
    useMapEvents({
        click(e) { setPos(e.latlng); },
    });
    return null;
}

export function StoreMapModal({ storeName, onClose, onSave, currentLoc }: any) {
    const [pos, setPos] = useState(currentLoc || { lat: 42.6977, lng: 23.3219 });

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center bg-white">
                    <h2 className="text-xl font-bold text-slate-900">Pin {storeName} Location</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
                </div>

                <div className="h-[400px] w-full">
                    <MapContainer center={[pos.lat, pos.lng]} zoom={13} className="h-full w-full">
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={pos} />
                        <ClickHandler setPos={setPos} />
                    </MapContainer>
                </div>

                <div className="p-6 bg-slate-50 flex justify-between items-center">
                    <p className="text-xs text-slate-400 font-mono">Lat: {pos.lat.toFixed(4)} Lng: {pos.lng.toFixed(4)}</p>
                    <button
                        onClick={() => onSave(pos)}
                        className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                    >
                        Save Location
                    </button>
                </div>
            </div>
        </div>
    );
}