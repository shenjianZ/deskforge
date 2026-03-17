/**
 * 功能注册表
 * 导出所有可用功能
 */

export { featuresData, implementedFeatures, categories } from './data';
export type { Feature, FeatureCategory } from './types';

// 重新导出功能列表，方便使用
import { implementedFeatures } from './data';
export const features = implementedFeatures;
