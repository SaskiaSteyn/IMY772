import WaterDataManager from '../../components/admin/WaterDataManager.jsx'
import { wgsFields } from './waterConfigs.js'

export default function Wgs() {
    return <WaterDataManager entity='wgs' title='WGS' fields={wgsFields} />
}
