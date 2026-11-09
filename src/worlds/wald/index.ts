import { registerWorld } from '../index';
import { enterWorld } from '../../world/worldScreen';
import '../../stations/wald';

registerWorld('wald', { enter: () => void enterWorld({ spawnWorld: 'wald' }) });
