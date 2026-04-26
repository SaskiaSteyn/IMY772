import WaterDataManager from '../../components/admin/water-data-manager.jsx';
import { amrResistanceGenesFields } from './water-configs.js';

export default function AmrResistanceGenes() {
    return (
        <WaterDataManager
            entity='amrResistanceGenes'
            title='AMR Resistance Genes'
            fields={amrResistanceGenesFields}
        />
    );
}
