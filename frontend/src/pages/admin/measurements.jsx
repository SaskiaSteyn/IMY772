import WaterDataManager from '../../components/admin/water-data-manager.jsx';
import { measurementsFields } from './water-configs.js';

export default function Measurements() {
    return (
        <WaterDataManager
            entity='measurements'
            title='Measurements'
            fields={measurementsFields}
        />
    );
}
