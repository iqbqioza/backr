import { createSignal, type JSX } from "solid-js";

/** Broken-URL-safe image: swaps in caller-provided fallback on error. */
export default function SafeImage(props: {
  src: string | undefined;
  alt: string;
  imgClass: string;
  fallback: JSX.Element;
}): JSX.Element {
  const [failed, setFailed] = createSignal(false);
  // NOTE: branch inside JSX so it re-evaluates when src arrives late (async profiles).
  return (
    <>
      {props.src !== undefined && !failed() ? (
        <img
          src={props.src}
          alt={props.alt}
          class={props.imgClass}
          onError={() => {
            setFailed(true);
          }}
        />
      ) : (
        props.fallback
      )}
    </>
  );
}
