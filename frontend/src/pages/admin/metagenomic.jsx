import WaterDataManager from '../../components/admin/water-data-manager.jsx';
import { metagenomicFields } from './water-configs.js';

export default function Metagenomic() {
    return (
        <WaterDataManager
            entity='metagenomic'
            title='Metagenomic'
            fields={metagenomicFields}
        />
    );
}
