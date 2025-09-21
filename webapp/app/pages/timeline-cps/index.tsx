import type { GetServerSideProps } from 'next';

export const getServerSideProps: GetServerSideProps = async () => {
  // No ID was provided at /timeline-cps, so send users to the songs list
  // where they can pick a song to open in the CPS view.
  return {
    redirect: {
      destination: '/songs',
      permanent: false,
    },
  };
};

export default function TimelineCpsIndex() {
  // This component won't render because of the SSR redirect.
  return null;
}
