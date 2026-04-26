import WaterDataManager from '../../components/admin/water-data-manager.jsx';
import { wgsFields } from './waterConfigs.js';

export default function Wgs() {
    return <WaterDataManager entity='wgs' title='WGS' fields={wgsFields} />;
}
