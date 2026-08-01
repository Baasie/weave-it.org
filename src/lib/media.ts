/**
 * The brand photographs and logos the *design* uses, by name.
 *
 * These files live under `public/wp-content/uploads/`, which is not where a new
 * site would put them. They are there for a specific reason: those addresses
 * are part of the URL contract — things outside this repository link to them,
 * and MIGRATION.md phase 7 keeps the parked WordPress directory alive for the
 * same reason. Moving them would break inbound links; copying them would
 * duplicate about 1.5 MB to no purpose.
 *
 * So the files stay, and this module is the seam. **A page refers to
 * `media.portrait`, never to a path**, which means:
 *
 *   - the WordPress layout is named in exactly one file rather than twenty-one,
 *   - renaming or moving an asset is one edit here,
 *   - and a missing file is a TypeScript error at the name, not a broken image
 *     nobody notices until it is on staging.
 *
 * Only assets referenced by a *template* belong here. Images inside content
 * come from Notion, land in `src/content/**\/_assets/`, and are handled by
 * Astro's image pipeline — see CoverImage.astro.
 */

const UPLOADS = '/wp-content/uploads';

export const media = {
  /** The black-and-white portrait, on the home hero and every author card. */
  portrait: `${UPLOADS}/2024/11/kenny_small_round_bw.jpg`,

  /** The three "Book me for …" band photographs. */
  consultancy: `${UPLOADS}/2023/10/consultancy_kenny.png`,
  training: `${UPLOADS}/2023/10/training_02.png`,
  speaking: `${UPLOADS}/2023/11/talks_kenny.png`,

  /** The full-bleed photograph on the training page. */
  workshopRoom: `${UPLOADS}/2023/10/fw_collaborativemodeling.jpg`,

  /** Service icons on the home page, in the order the section lists them. */
  iconConsultancy: `${UPLOADS}/2023/08/icon_assessing_architecture.png`,
  iconTraining: `${UPLOADS}/2023/08/icon_training.png`,
  iconTalks: `${UPLOADS}/2023/08/icon_public_speaking.png`,

  /** Book covers. */
  bookCsd: `${UPLOADS}/2024/07/mockupbook_csd.png`,
  bookVisualCollaboration: `${UPLOADS}/2023/10/book_visual_collaboration_tools.jpg`,
  bookDdd15: `${UPLOADS}/2023/10/book_domain_driven_design.jpg`,
  bookArchitectureModernization: `${UPLOADS}/2024/02/Tune-HI.jpg`,

  /** Partner logos, in the order the strip shows them. */
  partners: [
    { name: 'Xebia Academy', logo: `${UPLOADS}/2023/10/logo_xebia_academy.png` },
    { name: 'Heimeshoff IT', logo: `${UPLOADS}/2023/11/Logofinal_III_logo_gesamt.png` },
    { name: 'Aardling', logo: `${UPLOADS}/2023/10/logo_aardling.png` },
    { name: 'Equal Experts', logo: `${UPLOADS}/2023/10/logo_equal_experts.png` },
    { name: 'Team Topologies', logo: `${UPLOADS}/2023/10/logo_team_topologies.png` },
    { name: '42skillz', logo: `${UPLOADS}/2023/10/logo_42skillz.png` },
  ],
} as const;

export default media;
