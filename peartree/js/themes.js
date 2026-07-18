// themes.js — built-in theme presets and application defaults
// ─────────────────────────────────────────────────────────────────────────────

export { TYPEFACES, buildFont } from '@artic-network/pearcore/typefaces.js';

export const SETTINGS_KEY = 'peartree-settings';
export const USER_THEMES_KEY = 'peartree-user-themes';

export const DEFAULT_THEME = {
    // acts as the fallback base theme: all keys in REQUIRED_THEME_KEYS must be defined here, and other themes are allowed to be sparse overrides that inherit from this at applyTheme() time
    // Tree
    "canvasBgColor": "#ebe8e2",

    // Branches
    "branchColor": "#333231",
    "branchWidth": "1.5",
    "elbowRadius": "2",

    // Tip Labels
    "tipLabelFontSize": "11",
    "tipLabelColor": "#4b4b49",

    // Node Labels
    "nodeLabelFontSize": "9",
    "nodeLabelTypefaceKey": "",
    "nodeLabelTypefaceStyle": "",
    "nodeLabelColor": "#aaaaaa",
    "nodeLabelSpacing": "4",

    // Branch Labels
    "branchLabelFontSize": "9",
    "branchLabelTypefaceKey": "",
    "branchLabelTypefaceStyle": "",
    "branchLabelColor": "#aaaaaa",
    "branchLabelSpacing": "4",

    // Label Shapes
    "tipLabelShapeColor": "#aaaaaa",

    // Tip Shapes
    "tipShapeSize": "3",
    "tipShapeColor": "#ebe8e2",
    "tipShapeHaloSize": "1",
    "tipShapeBgColor": "#4b4b49",

    // Node Shapes
    "nodeShapeSize": "3",
    "nodeShapeColor": "#4b4b49",
    "nodeShapeHaloSize": "1",
    "nodeShapeBgColor": "#ebe8e2",

    // Branch Shapes
    "branchShapeColor": "#aaaaaa",
    "branchShapeHaloColor": "#ebe8e2",
    "branchShape2Color": "#aaaaaa",
    "branchShape3Color": "#aaaaaa",
    "branchShape4Color": "#aaaaaa",

    // Node Bars
    "nodeBarsColor": "#333231",
    "nodeBarsWidth": "6",
    "nodeBarsFillOpacity": "0.22",
    "nodeBarsStrokeOpacity": "0.55",

    // Clade Highlights
    "paintColour": "#ff8800",
    "cladeHighlightFillOpacity": "0.15",
    "cladeHighlightStrokeWidth": "1",
    "cladeHighlightStrokeOpacity": "0.7",
    "cladeHighlightColour": "#ffaa00",

    // Collapsed Clades
    "collapsedCladeFontSize": "11",
    "collapsedCladeStrokeWidth": "1",
    "collapsedCladeStrokeOpacity": "0.7",
    "collapsedCladeTypefaceKey": "",
    "collapsedCladeTypefaceStyle": "",

    // Legend
    "legendTextColor": "#4b4b49",
    "legendFontSize": "11",
    "legendTypefaceKey": "",
    "legendTypefaceStyle": "",

    // Axis
    "axisColor": "#4b4b49",
    "axisFontSize": "9",
    "axisTypefaceKey": "",
    "axisTypefaceStyle": "",
    "axisLineWidth": "1",

    // Root-to-tip: regression line
    "rttRegressionStyle": "bigdash",
    "rttRegressionColor": "#807e7c",
    "rttRegressionWidth": "1.5",
    // Root-to-tip: residual band (±2σ)
    "rttResidBandColor":       "#807e7c",
    "rttResidBandStyle":       "dash",
    "rttResidBandWidth":       "0.5",
    "rttResidBandFillColor":   "#807e7c",
    "rttResidBandFillOpacity": "0.1",
    // Root-to-tip: statistics box
    "rttStatsBgColor": "#bfbcb9",
    "rttStatsTextColor": "#4b4b49",
    "rttStatsFontSize": "11",
    // Root-to-tip: axes
    "rttAxisColor": "#4b4b49",
    "rttAxisFontSize": "9",
    "rttAxisLineWidth": "1",
    "rttAxisTypefaceKey": "",
    "rttAxisTypefaceStyle": "",

    // Theme (global typeface)
    "typeface": "Monospace",
    "typefaceStyle": "Regular",

    // Selection & Hover: selected tips
    "selectedLabelStyle": "bold",
    "selectedTipGrowthFactor": "1.0",
    "selectedTipGrowth": "2.5",
    "selectedTipMinSize": "3",
    "selectedTipFillColor": "#40847d",
    "selectedTipFillOpacity": "0.5",
    "selectedTipStrokeColor": "#92b5a7",
    "selectedTipStrokeWidth": "3.5",
    "selectedTipStrokeOpacity": "0.5",
    // Selection & Hover: MRCA node
    "selectedNodeGrowthFactor": "1.0",
    "selectedNodeGrowth": "2.5",
    "selectedNodeMinSize": "3",
    "selectedNodeFillColor": "#c1615a",
    "selectedNodeFillOpacity": "0.5",
    "selectedNodeStrokeColor": "#e06961",
    "selectedNodeStrokeWidth": "3.5",
    "selectedNodeStrokeOpacity": "0.5",
    // Selection & Hover: tip hover
    "tipHoverGrowthFactor": "1.0",
    "tipHoverGrowth": "2.5",
    "tipHoverMinSize": "5",
    "tipHoverFillColor": "#f5a700",
    "tipHoverFillOpacity": "0.5",
    "tipHoverStrokeColor": "#ebb642",
    "tipHoverStrokeWidth": "3.5",
    "tipHoverStrokeOpacity": "0.5",
    // Selection & Hover: node hover
    "nodeHoverGrowthFactor": "1.0",
    "nodeHoverGrowth": "2.5",
    "nodeHoverMinSize": "5",
    "nodeHoverFillColor": "#f5a700",
    "nodeHoverFillOpacity": "0.5",
    "nodeHoverStrokeColor": "#ebb642",
    "nodeHoverStrokeWidth": "3.5",
    "nodeHoverStrokeOpacity": "0.5",
    };

export const THEMES = {
    "Monochrome": { 
        inherit: '',
    },
    "ARTIC": {
        inherit: '',
        // Tree
        canvasBgColor: '#02292e',

        // Branches
        branchColor: '#19A699',
        branchWidth: '1',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#f7eeca',

        // Tip Shapes
        tipShapeSize: '3',
        tipShapeColor: '#B58901',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#02292e',

        // Node Shapes
        nodeShapeSize: '0',
        nodeShapeColor: '#E06961',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#02292e',

        // Node Bars
        nodeBarsColor: '#E06961',

        // Legend
        legendTextColor: '#f7eeca',

        // Axis
        axisColor: '#f7eeca',

        // Root-to-tip
        rttRegressionColor: '#19A699',
        rttStatsBgColor: '#011a1f',
        rttStatsTextColor: '#f7eeca',
        rttAxisColor: '#f7eeca',

        // Theme
        typeface: 'Helvetica Neue',
        typefaceStyle: 'Thin',

        // Selection & Hover: selected tips
        "selectedTipFillColor": "#B58901",
        "selectedTipStrokeColor": "#f7eeca",
        // Selection & Hover: MRCA node
        "selectedNodeFillColor": "#E06961",
        "selectedNodeStrokeColor": "#f7eeca",
    },
    "BEAST": {
        // Tree
        canvasBgColor: '#02292e',

        // Branches
        branchColor: '#68a3bb',
        branchWidth: '1',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#B1CBB8',

        // Tip Shapes
        tipShapeSize: '3',
        tipShapeColor: '#CBB944',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#02292e',

        // Node Shapes
        nodeShapeSize: '0',
        nodeShapeColor: '#3B6F84',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#02292e',

        // Node Bars
        nodeBarsColor: '#CBB944',

        // Legend
        legendTextColor: '#B1CBB8',

        // Axis
        axisColor: '#B1CBB8',

        // Root-to-tip
        rttRegressionColor: '#68a3bb',
        rttStatsBgColor: '#011a1e',
        rttStatsTextColor: '#B1CBB8',
        rttAxisColor: '#B1CBB8',

        // Theme
        typeface: 'Monospace',

        // Selection & Hover
        selectedTipFillColor: '#FFF4A9',
        selectedTipStrokeColor: '#FFF4A9',
        selectedNodeFillColor: '#B1CBB8',
        selectedNodeStrokeColor: '#B1CBB8',
    },
    "O'Toole": {
        // Tree
        canvasBgColor: '#f4f3f3',

        // Branches
        branchColor: '#7984BC',
        branchWidth: '1',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#7984BC',

        // Tip Shapes
        tipShapeSize: '3',
        tipShapeColor: '#AF808B',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#D8D4D3',

        // Node Shapes
        nodeShapeSize: '2',
        nodeShapeColor: '#88B2BA',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#D8D4D3',

        // Node Bars
        nodeBarsColor: '#88B2BA',

        // Legend
        legendTextColor: '#7984BC',

        // Axis
        axisColor: '#7984BC',

        // Root-to-tip
        rttRegressionColor: '#88B2BA',
        rttStatsBgColor: '#dddcdb',
        rttStatsTextColor: '#7984BC',
        rttAxisColor: '#7984BC',

        // Theme
        typeface: 'Helvetica Neue',
        typefaceStyle: 'Light',

        // Selection & Hover
        selectedTipFillColor: '#7f3e4d',
        selectedTipStrokeColor: '#7f3e4d',
        selectedNodeFillColor: '#263b3f',
        selectedNodeStrokeColor: '#263b3f',
        tipHoverFillColor: '#7f3e4d',
        tipHoverStrokeColor: '#7f3e4d',
        nodeHoverFillColor: '#263b3f',
        nodeHoverStrokeColor: '#263b3f',
    },
    "MCM": {
        // Tree
        canvasBgColor: '#1e2d3a',

        // Branches
        branchColor: '#edd59c',
        branchWidth: '1',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#f4c9a8',

        // Tip Shapes
        tipShapeSize: '4',
        tipShapeColor: '#e07b65',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#1e2d3a',

        // Node Shapes
        nodeShapeSize: '3',
        nodeShapeColor: '#7dbfcc',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#1e2d3a',

        // Node Bars
        nodeBarsColor: '#7dbfcc',

        // Legend
        legendTextColor: '#edd59c',

        // Axis
        axisColor: '#edd59c',

        // Root-to-tip
        rttRegressionColor: '#7dbfcc',
        rttStatsBgColor: '#121c24',
        rttStatsTextColor: '#edd59c',
        rttAxisColor: '#edd59c',

        // Theme
        typeface: 'Monospace',
    },
    "Belle": {
        // Tree
        canvasBgColor: '#E2D9BC',

        // Branches
        branchColor: '#302E2E',
        branchWidth: '1',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#A56567',

        // Tip Shapes
        tipShapeSize: '4',
        tipShapeColor: '#71BB93',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#302E2E',

        // Node Shapes
        nodeShapeSize: '2',
        nodeShapeColor: '#70939A',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#302E2E',

        // Node Bars
        nodeBarsColor: '#70939A',

        // Legend
        legendTextColor: '#302E2E',

        // Axis
        axisColor: '#302E2E',

        // Root-to-tip
        rttRegressionColor: '#70939A',
        rttStatsBgColor: '#A56567',
        rttStatsTextColor: '#302E2E',
        rttAxisColor: '#302E2E',

        // Theme
        typeface: 'Georgia',
        typefaceStyle: 'Bold',
    },
    "Primal": {
        // Tree
        canvasBgColor: '#C11924',

        // Branches
        branchColor: '#F9ED2E',
        branchWidth: '2',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#090A05',

        // Tip Shapes
        tipShapeSize: '4',
        tipShapeColor: '#303B90',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#FBFFFE',

        // Node Shapes
        nodeShapeSize: '3',
        nodeShapeColor: '#090A05',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#FBFFFE',

        // Node Bars
        nodeBarsColor: '#303B90',

        // Legend
        legendTextColor: '#302E2E',

        // Axis
        axisColor: '#302E2E',

        // Root-to-tip
        rttRegressionColor: '#F9ED2E',
        rttStatsBgColor: '#303B90',
        rttStatsTextColor: '#FBFFFE',
        rttAxisColor: '#302E2E',

        // Theme
        typeface: 'Monospace',
    },
    "Contagion": {
        inherit: '',
        // Tree
        canvasBgColor: '#b59a3e',

        // Branches
        branchColor: '#4a4b2a',
        branchWidth: '2',

        // Tip Labels
        tipLabelFontSize: '11',
        tipLabelColor: '#2f2412',

        // Tip Shapes
        tipShapeSize: '5',
        tipShapeColor: '#8f9b50',
        tipShapeHaloSize: '1',
        tipShapeBgColor: '#4a4b2a',

        // Node Shapes
        nodeShapeSize: '3',
        nodeShapeColor: '#924034',
        nodeShapeHaloSize: '1',
        nodeShapeBgColor: '#4a4b2a',

        // Node Bars
        nodeBarsColor: '#6b7442',

        // Legend
        legendTextColor: '#2f2412',

        // Axis
        axisColor: '#2f2412',

        // Root-to-tip
        rttRegressionColor: '#6f7f49',
        rttStatsBgColor: '#8f7429',
        rttStatsTextColor: '#22190d',
        rttAxisColor: '#2f2412',

        // Theme
        typeface: 'Helvetica Neue',
        typefaceStyle: 'Regular',

        // Selection & Hover
        selectedTipFillColor: '#8f3022',
        selectedTipStrokeColor: '#8f3022',
        selectedNodeFillColor: '#d2bb5e',
        selectedNodeStrokeColor: '#d2bb5e',
        tipHoverFillColor: '#d2bb5e',
        tipHoverStrokeColor: '#d2bb5e',
        nodeHoverFillColor: '#8f3022',
        nodeHoverStrokeColor: '#8f3022',
    },
};

