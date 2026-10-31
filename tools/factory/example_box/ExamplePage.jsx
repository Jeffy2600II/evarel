import React from 'react';
import { getExampleData } from './example.tray.js';
import { ExampleHeader } from './parts/ExampleHeader.jsx';

/**
 * โครงหน้าหลักของกล่องตัวอย่าง (ExamplePage.jsx - ชั้นที่ 1)
 */
export function ExamplePage() {
  const data = getExampleData();
  return (
    <div className="box-example">
      <ExampleHeader title={data.title} />
      <p>{data.description}</p>
    </div>
  );
}

export default ExamplePage;
