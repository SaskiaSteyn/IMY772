import WaterDataManager from '../../components/admin/water-data-manager.jsx';
import { virulenceGenesFields } from './water-configs.js';

export default function VirulenceGenes() {
    return (
        <WaterDataManager
            entity='virulenceGenes'
            title='Virulence Genes'
            fields={virulenceGenesFields}
        />
    );
}
