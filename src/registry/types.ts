import { ComponentType } from "react";
import { SectionManifest } from "@/core/schema/manifest";
import { AssetBinding } from "@/core/schema/site-config";

export interface SectionComponentProps<TContent = Record<string, any>> {
  instanceId: string;
  content: TContent;
  assetBindings: AssetBinding[];
  animationPreset?: string;
  settings?: Record<string, any>;
}

export interface SectionRegistryEntry {
  manifest: SectionManifest;
  component: ComponentType<SectionComponentProps<any>>;
}
