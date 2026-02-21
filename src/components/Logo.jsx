import React from "react";

export default function Logo({ size = 48, className = "" }) {
    return (
        <img
            src="/Logo.svg"
            alt="Logo"
            style={{ width: size, height: size, objectFit: 'contain' }}
            className={className}
        />
    );
}
