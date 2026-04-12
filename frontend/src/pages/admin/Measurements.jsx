import WaterDataManager from '../../components/admin/WaterDataManager.jsx'
import { measurementsFields } from './waterConfigs.js'

export default function Measurements() {
    return (
        <WaterDataManager
            entity='measurements'
            title='Measurements'
            fields={measurementsFields}
        />
    )
}
