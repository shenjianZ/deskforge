/**
 * 功能分类
 */
export type FeatureCategory = 'tool' | 'system' | 'media' | 'dev';

/**
 * 功能接口
 */
export interface Feature {
  /** 功能唯一标识 */
  id: string;
  /** 功能名称 */
  name: string;
  /** 功能描述 */
  description: string;
  /** 图标名称（lucide-react） */
  icon: string;
  /** 功能分类 */
  category: FeatureCategory;
  /** 路由路径 */
  route: string;
  /** 快捷键（可选） */
  shortcut?: string;
  /** 搜索标签 */
  tags: string[];
  /** 是否已实现 */
  implemented: boolean;
}
