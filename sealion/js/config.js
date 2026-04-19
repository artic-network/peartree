// sealion/js/config.js — Configuration constants for the Sealion alignment viewer.

/**
 * Example datasets shown in the "Example" tab of the Open FASTA dialog.
 * Each entry has:
 *   title       {string}  Short name shown on the load button.
 *   description {string}  One-line description shown below the title.
 *   path        {string}  Path to the FASTA file, relative to the sealion/ directory.
 *   reference   {string|null}  Optional path to a reference genome file to auto-load.
 */
export const EXAMPLE_DATASETS = [
  {
    title:       'Mpox clade IIb',
    description: '199 Mpox virus clade IIb alignment with reference genome annotation (length 197,209).',
    path:        'data/mpox_clade_iib.fasta',
    reference:   'data/NC_063383_mpox_clade_iib.gb',
  },
  {
    title:       'Ebola virus (Makona)',
    description: '1,610 Ebola virus sequences from the 2014–2016 West Africa epidemic (length 18,959).',
    path:        'data/Makona_1610.fasta',
    reference:   'data/NC_002549_EBOV_1976.gb', // reference not 
  },
];

/** Root URL of the deployed site — used as a fallback when a relative path
 *  fails (e.g. when the HTML file is opened directly from disk). */
export const SEALION_BASE_URL = 'https://artic-network.github.io/sealion/sealion/';
