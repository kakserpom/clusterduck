import React from 'react';

export default function PageContent(props) {
  return (
    <main id="primary-content" tabIndex="-1" role="main" {...props}>
      {props.children}
    </main>
  );
}
