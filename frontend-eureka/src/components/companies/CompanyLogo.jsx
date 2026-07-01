import React, { useEffect, useState } from "react";
import { Building2 } from "lucide-react";
import companyService from "../../services/company.service";

/**
 * Muestra el logo de una empresa. Como /companies/{id}/logo requiere
 * autenticación, lo descargamos como blob (vía axios, con el token) en
 * lugar de usar <img src="..."> directamente.
 *
 * Si la empresa no tiene logo (has_logo=false) o falla la carga, muestra
 * un placeholder con el ícono de edificio.
 */
export const CompanyLogo = ({ companyId, hasLogo, size = 40, className = "" }) => {
  const [objectUrl, setObjectUrl] = useState(null);

  useEffect(() => {
    if (!hasLogo) {
      setObjectUrl(null);
      return;
    }
    let url;
    companyService
      .getLogo(companyId)
      .then((blob) => {
        url = window.URL.createObjectURL(blob);
        setObjectUrl(url);
      })
      .catch(() => setObjectUrl(null));

    return () => {
      if (url) window.URL.revokeObjectURL(url);
    };
  }, [companyId, hasLogo]);

  const dimension = `${size}px`;

  if (objectUrl) {
    return (
      <img
        src={objectUrl}
        alt="Logo"
        style={{ width: dimension, height: dimension }}
        className={`object-contain rounded-lg ${className}`}
      />
    );
  }

  return (
    <div
      style={{ width: dimension, height: dimension }}
      className={`flex items-center justify-center bg-green-100 rounded-lg ${className}`}
    >
      <Building2 className="w-1/2 h-1/2 text-green-600" />
    </div>
  );
};

export default CompanyLogo;
