/**
 * Grid Layout Engine
 * Calculates optimal spatial positioning for journey map elements on Miro boards
 */

import {
  JourneyMap,
  JourneyPhase,
  LayoutOptions,
  GridConfig,
  Position,
  Geometry,
  AlignmentType,
  DistributionType
} from '../types/index';
import { Logger } from './logger';

export interface LayoutResult {
  bounds: LayoutBounds;
  phases: PhaseLayout[];
  totalElements: number;
  gridInfo: GridInfo;
}

export interface LayoutBounds {
  topLeft: Position;
  bottomRight: Position;
  width: number;
  height: number;
}

export interface PhaseLayout {
  phaseId: string;
  phaseName: string;
  bounds: LayoutBounds;
  header: ElementLayout;
  touchpoints: ElementLayout[];
  painPoints: ElementLayout[];
  emotions: ElementLayout[];
  quotes: ElementLayout[];
  actions: ElementLayout[];
  channels: ElementLayout[];
}

export interface ElementLayout {
  id: string;
  position: Position;
  geometry: Geometry;
  gridCell: GridCell;
}

export interface GridCell {
  column: number;
  row: number;
}

export interface GridInfo {
  totalColumns: number;
  totalRows: number;
  cellWidth: number;
  cellHeight: number;
  margins: {
    x: number;
    y: number;
  };
}

export class GridLayout {
  private config: LayoutOptions;
  private logger: Logger;

  constructor(config: LayoutOptions) {
    this.config = config;
    this.logger = new Logger('GridLayout');
  }

  /**
   * Generate optimal layout for entire journey map
   */
  generateLayout(journeyMap: JourneyMap): LayoutResult {
    this.logger.info(`Generating layout for journey map: ${journeyMap.title}`);
    this.logger.debug(`Phases: ${journeyMap.phases.length}`);

    // Calculate phase layouts
    const phases = this.calculatePhaseLayouts(journeyMap.phases);
    
    // Calculate overall bounds
    const bounds = this.calculateOverallBounds(phases);
    
    // Count total elements
    const totalElements = this.countTotalElements(journeyMap);

    // Calculate grid info
    const gridInfo = this.calculateGridInfo(phases);

    const result: LayoutResult = {
      bounds,
      phases,
      totalElements,
      gridInfo
    };

    this.logger.info(`Layout generated: ${phases.length} phases, ${totalElements} elements`);
    this.logger.debug(`Overall bounds: ${bounds.width}x${bounds.height}`);

    return result;
  }

  /**
   * Calculate layouts for all phases
   */
  private calculatePhaseLayouts(phases: JourneyPhase[]): PhaseLayout[] {
    const layouts: PhaseLayout[] = [];
    let currentX = this.config.grid.marginX;
    const baseY = this.config.grid.marginY;

    for (let i = 0; i < phases.length; i++) {
      const phase = phases[i];
      const phaseLayout = this.calculatePhaseLayout(phase, currentX, baseY, i);
      layouts.push(phaseLayout);
      
      // Move to next phase position
      currentX = phaseLayout.bounds.bottomRight.x + this.config.spacing.phase;
    }

    return layouts;
  }

  /**
   * Calculate layout for a single phase
   */
  private calculatePhaseLayout(phase: JourneyPhase, startX: number, startY: number, phaseIndex: number): PhaseLayout {
    const phaseWidth = this.calculatePhaseWidth(phase);
    const currentPosition = { x: startX, y: startY };

    // Phase header
    const header = this.createElementLayout(
      `${phase.id}_header`,
      currentPosition,
      { width: phaseWidth, height: 60 },
      { column: phaseIndex, row: 0 }
    );

    currentPosition.y += 60 + this.config.spacing.group;

    // Layout different element types in sections
    const touchpoints = this.layoutElementsInSection(
      phase.touchpoints.map(tp => tp.id),
      currentPosition,
      phaseWidth,
      'touchpoint'
    );

    currentPosition.y += this.calculateSectionHeight(touchpoints) + this.config.spacing.group;

    const painPoints = this.layoutElementsInSection(
      phase.painPoints.map(pp => pp.id),
      currentPosition,
      phaseWidth,
      'painpoint'
    );

    currentPosition.y += this.calculateSectionHeight(painPoints) + this.config.spacing.group;

    const emotions = this.layoutElementsInSection(
      phase.emotions.map(e => e.id),
      currentPosition,
      phaseWidth,
      'emotion'
    );

    currentPosition.y += this.calculateSectionHeight(emotions) + this.config.spacing.group;

    const quotes = this.layoutElementsInSection(
      phase.quotes.map(q => q.id),
      currentPosition,
      phaseWidth,
      'quote'
    );

    currentPosition.y += this.calculateSectionHeight(quotes) + this.config.spacing.group;

    const actions = this.layoutElementsInSection(
      phase.actions.map(a => a.id),
      currentPosition,
      phaseWidth,
      'action'
    );

    currentPosition.y += this.calculateSectionHeight(actions) + this.config.spacing.group;

    const channels = this.layoutElementsInSection(
      phase.channels.map(c => c.id),
      currentPosition,
      phaseWidth,
      'channel'
    );

    // Calculate phase bounds
    const maxY = currentPosition.y + this.calculateSectionHeight(channels);
    const bounds: LayoutBounds = {
      topLeft: { x: startX, y: startY },
      bottomRight: { x: startX + phaseWidth, y: maxY },
      width: phaseWidth,
      height: maxY - startY
    };

    return {
      phaseId: phase.id,
      phaseName: phase.name,
      bounds,
      header,
      touchpoints,
      painPoints,
      emotions,
      quotes,
      actions,
      channels
    };
  }

  /**
   * Layout elements within a section
   */
  private layoutElementsInSection(
    elementIds: string[],
    startPosition: Position,
    sectionWidth: number,
    elementType: string
  ): ElementLayout[] {
    if (elementIds.length === 0) {
      return [];
    }

    const layouts: ElementLayout[] = [];
    const elementGeometry = this.getElementGeometry(elementType);
    const elementsPerRow = Math.floor(sectionWidth / (elementGeometry.width + this.config.spacing.element));
    
    let currentX = startPosition.x;
    let currentY = startPosition.y;
    let currentRow = 0;
    let currentCol = 0;

    for (let i = 0; i < elementIds.length; i++) {
      const elementId = elementIds[i];
      
      // Check if we need to move to next row
      if (currentCol >= elementsPerRow) {
        currentCol = 0;
        currentRow++;
        currentX = startPosition.x;
        currentY += elementGeometry.height + this.config.spacing.element;
      }

      const layout = this.createElementLayout(
        elementId,
        { x: currentX, y: currentY },
        elementGeometry,
        { column: currentCol, row: currentRow }
      );

      layouts.push(layout);

      // Move to next position
      currentX += elementGeometry.width + this.config.spacing.element;
      currentCol++;
    }

    return layouts;
  }

  /**
   * Create element layout
   */
  private createElementLayout(
    id: string,
    position: Position,
    geometry: Geometry,
    gridCell: GridCell
  ): ElementLayout {
    return {
      id,
      position: { ...position },
      geometry: { ...geometry },
      gridCell: { ...gridCell }
    };
  }

  /**
   * Calculate optimal width for a phase based on its content
   */
  private calculatePhaseWidth(phase: JourneyPhase): number {
    const maxElements = Math.max(
      phase.touchpoints.length,
      phase.painPoints.length,
      phase.emotions.length,
      phase.quotes.length,
      phase.actions.length,
      phase.channels.length
    );

    // Base width calculation
    const baseElementWidth = 150;
    const spacing = this.config.spacing.element;
    const minWidth = 300;
    const maxWidth = 800;

    const calculatedWidth = Math.max(
      minWidth,
      Math.min(
        maxWidth,
        (baseElementWidth + spacing) * Math.min(maxElements, 4) - spacing
      )
    );

    return calculatedWidth;
  }

  /**
   * Get geometry for different element types
   */
  private getElementGeometry(elementType: string): Geometry {
    const baseGeometry = { width: 150, height: 100 };

    switch (elementType) {
      case 'touchpoint':
        return { width: 160, height: 80 };
      case 'painpoint':
        return { width: 140, height: 120 };
      case 'emotion':
        return { width: 100, height: 100 };
      case 'quote':
        return { width: 200, height: 80 };
      case 'action':
        return { width: 130, height: 60 };
      case 'channel':
        return { width: 120, height: 80 };
      default:
        return baseGeometry;
    }
  }

  /**
   * Calculate height of a section
   */
  private calculateSectionHeight(elements: ElementLayout[]): number {
    if (elements.length === 0) {
      return 0;
    }

    const maxRow = Math.max(...elements.map(e => e.gridCell.row));
    const elementHeight = elements[0]?.geometry.height || 100;
    
    return (maxRow + 1) * (elementHeight + this.config.spacing.element) - this.config.spacing.element;
  }

  /**
   * Calculate overall bounds
   */
  private calculateOverallBounds(phases: PhaseLayout[]): LayoutBounds {
    if (phases.length === 0) {
      return {
        topLeft: { x: 0, y: 0 },
        bottomRight: { x: 0, y: 0 },
        width: 0,
        height: 0
      };
    }

    const minX = Math.min(...phases.map(p => p.bounds.topLeft.x));
    const minY = Math.min(...phases.map(p => p.bounds.topLeft.y));
    const maxX = Math.max(...phases.map(p => p.bounds.bottomRight.x));
    const maxY = Math.max(...phases.map(p => p.bounds.bottomRight.y));

    return {
      topLeft: { x: minX, y: minY },
      bottomRight: { x: maxX, y: maxY },
      width: maxX - minX,
      height: maxY - minY
    };
  }

  /**
   * Count total elements in journey map
   */
  private countTotalElements(journeyMap: JourneyMap): number {
    return journeyMap.phases.reduce((total, phase) => {
      return total +
        phase.touchpoints.length +
        phase.painPoints.length +
        phase.emotions.length +
        phase.quotes.length +
        phase.actions.length +
        phase.channels.length;
    }, 0);
  }

  /**
   * Calculate grid information
   */
  private calculateGridInfo(phases: PhaseLayout[]): GridInfo {
    const totalColumns = phases.length;
    let totalRows = 0;

    phases.forEach(phase => {
      const phaseRows = this.calculatePhaseRows(phase);
      totalRows = Math.max(totalRows, phaseRows);
    });

    return {
      totalColumns,
      totalRows,
      cellWidth: this.config.grid.cellWidth,
      cellHeight: this.config.grid.cellHeight,
      margins: {
        x: this.config.grid.marginX,
        y: this.config.grid.marginY
      }
    };
  }

  /**
   * Calculate number of rows in a phase
   */
  private calculatePhaseRows(phase: PhaseLayout): number {
    const allElements = [
      ...phase.touchpoints,
      ...phase.painPoints,
      ...phase.emotions,
      ...phase.quotes,
      ...phase.actions,
      ...phase.channels
    ];

    if (allElements.length === 0) {
      return 1; // Header only
    }

    return Math.max(...allElements.map(e => e.gridCell.row)) + 2; // +1 for 0-based, +1 for header
  }

  /**
   * Optimize layout for better visual distribution
   */
  optimizeLayout(layout: LayoutResult): LayoutResult {
    this.logger.debug('Optimizing layout distribution');

    // Apply alignment optimizations
    const optimizedPhases = layout.phases.map(phase => 
      this.optimizePhaseAlignment(phase)
    );

    // Recalculate bounds after optimization
    const optimizedBounds = this.calculateOverallBounds(optimizedPhases);

    return {
      ...layout,
      bounds: optimizedBounds,
      phases: optimizedPhases
    };
  }

  /**
   * Optimize alignment within a phase
   */
  private optimizePhaseAlignment(phase: PhaseLayout): PhaseLayout {
    // Center align elements with fewer items
    const sections = [
      { elements: phase.touchpoints, name: 'touchpoints' },
      { elements: phase.painPoints, name: 'painPoints' },
      { elements: phase.emotions, name: 'emotions' },
      { elements: phase.quotes, name: 'quotes' },
      { elements: phase.actions, name: 'actions' },
      { elements: phase.channels, name: 'channels' }
    ];

    const optimizedSections: any = {};

    sections.forEach(section => {
      if (section.elements.length > 0) {
        optimizedSections[section.name] = this.centerAlignElements(
          section.elements,
          phase.bounds.width
        );
      } else {
        optimizedSections[section.name] = section.elements;
      }
    });

    return {
      ...phase,
      touchpoints: optimizedSections.touchpoints || phase.touchpoints,
      painPoints: optimizedSections.painPoints || phase.painPoints,
      emotions: optimizedSections.emotions || phase.emotions,
      quotes: optimizedSections.quotes || phase.quotes,
      actions: optimizedSections.actions || phase.actions,
      channels: optimizedSections.channels || phase.channels
    };
  }

  /**
   * Center align elements within available width
   */
  private centerAlignElements(elements: ElementLayout[], availableWidth: number): ElementLayout[] {
    if (elements.length === 0) {
      return elements;
    }

    const totalElementsWidth = elements.reduce((sum, el) => 
      sum + el.geometry.width, 0
    );
    const totalSpacing = (elements.length - 1) * this.config.spacing.element;
    const contentWidth = totalElementsWidth + totalSpacing;

    if (contentWidth >= availableWidth) {
      return elements; // No centering needed
    }

    const offset = (availableWidth - contentWidth) / 2;

    return elements.map(element => ({
      ...element,
      position: {
        ...element.position,
        x: element.position.x + offset
      }
    }));
  }

  /**
   * Get layout statistics
   */
  getLayoutStats(layout: LayoutResult): any {
    return {
      phases: layout.phases.length,
      totalElements: layout.totalElements,
      bounds: {
        width: layout.bounds.width,
        height: layout.bounds.height
      },
      grid: layout.gridInfo,
      density: layout.totalElements / (layout.bounds.width * layout.bounds.height) * 10000, // Elements per 10k sq units
      efficiency: this.calculateLayoutEfficiency(layout)
    };
  }

  /**
   * Calculate layout efficiency score
   */
  private calculateLayoutEfficiency(layout: LayoutResult): number {
    // Simple efficiency calculation based on space utilization
    const totalElementArea = layout.phases.reduce((sum, phase) => {
      const phaseElementArea = [
        ...phase.touchpoints,
        ...phase.painPoints,
        ...phase.emotions,
        ...phase.quotes,
        ...phase.actions,
        ...phase.channels
      ].reduce((phaseSum, element) => 
        phaseSum + (element.geometry.width * element.geometry.height), 0
      );
      return sum + phaseElementArea;
    }, 0);

    const totalAvailableArea = layout.bounds.width * layout.bounds.height;
    
    return totalAvailableArea > 0 ? (totalElementArea / totalAvailableArea) * 100 : 0;
  }
}