/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="w-full p-4 text-center">
      <div className="flex items-center justify-center">
          <h1 className="text-6xl md:text-8xl font-extrabold tracking-tight text-zinc-100">
            Material Transfer
          </h1>
      </div>
      <p className="mt-4 text-lg text-zinc-300 max-w-3xl mx-auto">
        An app that applies a selected material in the Product to a selected area in the Scene.
        <br />
        Use the brush to select the source material and target area, then let Gemini transform your image.
      </p>
    </header>
  );
};

export default Header;