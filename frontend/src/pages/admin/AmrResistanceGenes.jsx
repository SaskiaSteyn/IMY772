import WaterDataManager from '../../components/admin/WaterDataManager.jsx'
import { amrResistanceGenesFields } from './waterConfigs.js'

export default function AmrResistanceGenes() {
    return (
        <WaterDataManager
            entity='amrResistanceGenes'
            title='AMR Resistance Genes'
            fields={amrResistanceGenesFields}
        />
    )
}
