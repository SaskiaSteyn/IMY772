import WaterDataManager from '../../components/admin/WaterDataManager.jsx'
import { virulenceGenesFields } from './waterConfigs.js'

export default function VirulenceGenes() {
    return (
        <WaterDataManager
            entity='virulenceGenes'
            title='Virulence Genes'
            fields={virulenceGenesFields}
        />
    )
}
