import WaterDataManager from '../../components/admin/WaterDataManager.jsx'
import { metagenomicFields } from './waterConfigs.js'

export default function Metagenomic() {
    return (
        <WaterDataManager
            entity='metagenomic'
            title='Metagenomic'
            fields={metagenomicFields}
        />
    )
}
