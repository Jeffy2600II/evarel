import React from 'react';

/**
 * ชิ้นส่วนย่อยของกล่องตัวอย่าง (parts/ExampleHeader.jsx - ชั้นที่ 2)
 */
export function ExampleHeader({ title }) {
  return (
    <header className="example-header">
      <h1>{title}</h1>
    </header>
  );
}
