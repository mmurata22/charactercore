import { APP_NAME } from '../../lib/constants';

/** The charactercore mark (an apple whose bite is a character's side profile) and wordmark. */
export default function Logo({ size = 28 }) {
  return (
    <span className="logo">
      <img src="/icon.svg" width={size} height={size} alt="" />
      <span className="slate">{APP_NAME}</span>
    </span>
  );
}
