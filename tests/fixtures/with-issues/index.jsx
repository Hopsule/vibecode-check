import React, { useState } from 'react';

export function WithIssues() {
  const [x, setX] = useState(0);
  console.log('hello');
  return <div onClick={() => setX(1)}>{x}</div>;
}
