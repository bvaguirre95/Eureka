import React, { useState, useEffect } from "react";
import { Badge } from "../components/ui/badge";
import api, { BACKEND_URL } from "../services/api";
import { LoginForm } from "../components/auth/LoginForm";
import {
  Shield,
  FileText,
  Building2,
  Leaf,
  Users,
  TrendingUp,
  CheckCircle,
  Award,
  Target,
  Heart,
  Factory,
  Mail,
  Phone,
  MapPin,
  Send,
  Loader,
  LogIn,
  X,
  ChevronRight,
  ChevronLeft,
  ImageIcon,
} from "lucide-react";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import Swal from "sweetalert2";


// ── Carrusel de clientes ──────────────────────────────────────────────────────
const ClientCarousel = ({ clients }) => {
  const [current, setCurrent] = React.useState(0);
  const [paused, setPaused] = React.useState(false);
  const VISIBLE = 5; // tarjetas visibles simultáneamente en desktop
  const total = clients.length;

  // Auto-avance cada 3 s salvo que el usuario esté interactuando
  React.useEffect(() => {
    if (paused || total <= VISIBLE) return;
    const id = setInterval(() => setCurrent((c) => (c + 1) % total), 3000);
    return () => clearInterval(id);
  }, [paused, total]);

  const prev = () => setCurrent((c) => (c - 1 + total) % total);
  const next = () => setCurrent((c) => (c + 1) % total);

  // Construir la lista circular de índices visibles
  const visibleIndices = Array.from({ length: Math.min(VISIBLE, total) }, (_, i) =>
    (current + i) % total
  );

  const ClientCard = ({ client }) => {
    const display = client.nombre_comercial || client.razon_social;
    const initials = display
      .split(" ")
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
    const [logoError, setLogoError] = React.useState(false);
    const showLogo = client.has_logo && !logoError;

    return (
      <div className="flex-shrink-0 w-40 sm:w-48 bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-green-200 transition-all duration-200 mx-2">
        {showLogo ? (
          <img
            src={`${BACKEND_URL}/api/v1/public/companies/${client.id}/logo`}
            alt={display}
            className="w-14 h-14 object-contain rounded-lg mb-3"
            onError={() => setLogoError(true)}
          />
        ) : (
          <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-white font-bold text-lg mb-3 flex-shrink-0">
            {initials}
          </div>
        )}
        <p className="font-semibold text-gray-900 text-xs leading-snug line-clamp-2">
          {display}
        </p>
        {client.industria && (
          <p className="text-xs text-gray-400 mt-1 capitalize truncate w-full">
            {client.industria}
          </p>
        )}
        {client.ciudad && (
          <p className="text-xs text-green-600 mt-0.5 truncate w-full">
            {client.ciudad}
          </p>
        )}
      </div>
    );
  };

  // Si caben todos sin scroll, mostrar grid simple
  if (total <= VISIBLE) {
    return (
      <div className="flex flex-wrap justify-center gap-4">
        {clients.map((c) => <ClientCard key={c.id} client={c} />)}
      </div>
    );
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Flecha izquierda */}
      <button
        onClick={prev}
        className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow hover:bg-green-50 hover:border-green-400 transition-all"
        aria-label="Anterior"
      >
        <ChevronLeft className="w-5 h-5 text-gray-600" />
      </button>

      {/* Pista */}
      <div className="overflow-hidden mx-8">
        <div className="flex justify-center transition-all duration-500">
          {visibleIndices.map((idx) => (
            <ClientCard key={`${idx}-${clients[idx].id}`} client={clients[idx]} />
          ))}
        </div>
      </div>

      {/* Flecha derecha */}
      <button
        onClick={next}
        className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-gray-200 shadow hover:bg-green-50 hover:border-green-400 transition-all"
        aria-label="Siguiente"
      >
        <ChevronRight className="w-5 h-5 text-gray-600" />
      </button>

      {/* Indicadores de puntos */}
      <div className="flex justify-center gap-1.5 mt-6">
        {clients.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${
              i === current ? "bg-green-600 w-4" : "bg-gray-300 hover:bg-gray-400"
            }`}
            aria-label={`Ir a cliente ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
};

const LandingPage = () => {
  const [contactForm, setContactForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [serviceGalleries, setServiceGalleries] = useState({});
  const [loading, setLoading] = useState(true);
  const mainServices = [
    {
      id: "quality",
      icon: Shield,
      title: "GESTIÓN DE CALIDAD",
      color: "from-blue-500 to-blue-600",
      services: [
        "ISO 9001 - Sistemas de Gestión de Calidad",
        "Control de Calidad e Inocuidad",
        "Higiene y Saneamiento en Industria Alimentaria",
        "Registro de Notificaciones Sanitarias",
        "Buenas Prácticas de Manufactura (BPM)",
        "POES - Procedimientos Operativos Estandarizados",
      ],
    },
    {
      id: "safety",
      icon: Heart,
      title: "SEGURIDAD Y SALUD EN EL TRABAJO",
      color: "from-red-500 to-red-600",
      services: [
        "ISO 45001 - Sistema de Gestión de SST",
        "Reglamento de Higiene y Seguridad",
        "Plan de Emergencia y Autoprotección",
        "Plan de Prevención de Riesgos Laborales",
        "Procedimientos de Trabajo Seguros",
        "Capacitaciones e Inducciones de Seguridad",
      ],
    },
    {
      id: "environment",
      icon: Leaf,
      title: "GESTIÓN AMBIENTAL",
      color: "from-green-500 to-green-600",
      services: [
        "ISO 14001 - Sistema de Gestión Ambiental",
        "Certificado, Registro y Licencia Ambiental",
        "Registro Generador de Desechos Peligrosos",
        "Plan de Minimización de Desechos",
        "Declaración Anual de Desechos Peligrosos",
        "Estudios de Impacto Ambiental",
        "Auditorías Ambientales",
        "Gestión de Sustancias Catalogadas (SCSF)",
      ],
    },
  ];

  const industries = [
    { name: "Empacadoras de Camarón", icon: Factory },
    { name: "Industria Alimentaria", icon: Factory },
    { name: "Fábricas de Hielo", icon: Factory },
    { name: "Empresas de Baterías", icon: Factory },
    { name: "Farmaceúticas", icon: Building2 },
    { name: "Laboratorios", icon: Building2 },
    { name: "Minería", icon: Factory },
    { name: "Textiles", icon: Factory },
  ];

  const whyChooseUs = [
    {
      icon: Target,
      title: "Mejora Continua",
      description:
        "Contribuimos en la mejora continua de los diferentes procesos de cada empresa",
    },
    {
      icon: Award,
      title: "Experiencia Certificada",
      description:
        "Equipo especializado en normativas nacionales e internacionales",
    },
    {
      icon: TrendingUp,
      title: "Resultados Medibles",
      description: "Incremento de rentabilidad y productividad demostrable",
    },
    {
      icon: Users,
      title: "Atención Personalizada",
      description: "Asesoría y representación técnica adaptada a cada cliente",
    },
  ];

  // Cargar clientes
  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const response = await api.get("/api/v1/public/companies?org_slug=eureka&limit=12");
      setClients(response.data);
    } catch (error) {
      console.error("Error loading clients:", error);
    } finally {
      setLoadingClients(false);
    }
  };



  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSendingMessage(true);

    try {
      await api.post("/contact/send", contactForm);

      Swal.fire({
        icon: "success",
        title: "¡Mensaje Enviado!",
        text: "Nos pondremos en contacto contigo pronto",
        confirmButtonColor: "#16a34a",
      });

      setContactForm({ name: "", email: "", phone: "", message: "" });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.detail || "Error al enviar el mensaje",
        confirmButtonColor: "#16a34a",
      });
    } finally {
      setSendingMessage(false);
    }
  };

// Componente Modal simplificado - Solo carrusel de imágenes
const ServiceGalleryModal = ({ service, images, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!service || images.length === 0) {
    return null;
  }

  const currentImage = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        
        {/* Carrusel */}
        <div className="relative bg-black">
          <img
            src={`${process.env.REACT_APP_BACKEND_URL}/${currentImage.image_url}`}
            alt={service.title}
            className="w-full h-auto max-h-[70vh] object-contain"
            onError={(e) => {
              e.target.src = 'https://via.placeholder.com/800x600?text=Error+cargando+imagen';
            }}
          />
          {/* Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition"
          >
            ✕
          </button>

          {/* Controles Carrusel */}
          {images.length > 1 && (
            <>
              {/* Botón Anterior */}
              <button
                onClick={() => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition"
              >
                ◀
              </button>

              {/* Botón Siguiente */}
              <button
                onClick={() => setCurrentIndex((prev) => (prev + 1) % images.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition"
              >
                ▶
              </button>

              {/* Indicadores */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentIndex(i)}
                    className={`h-2 rounded-full transition ${
                      i === currentIndex ? 'bg-white w-8' : 'bg-white/50 w-2'
                    }`}
                  />
                ))}
              </div>

              {/* Contador */}
              <div className="absolute top-4 right-12 bg-black/60 text-white px-3 py-1 rounded-full text-xs font-semibold">
                {currentIndex + 1}/{images.length}
              </div>
            </>
          )}
        </div>

        {/* Descripción de la imagen */}
        <div className="bg-white p-4 sm:p-6">
          <p className="text-gray-700 text-sm sm:text-base">
            {currentImage?.description || 'Sin descripción'}
          </p>
        </div>
      </div>
    </div>
  );
};

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
     <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
        {/* LOGO */}
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg">
            <img
              src="/logo.png"
              alt="EUREKA Consultoría"
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
            />
          </div>

          <div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              EUREKA
            </div>

            <p className="text-xs sm:text-sm text-green-600 font-medium">
              Sistemas Integrados de Gestión
            </p>
          </div>
        </div>

        {/* MENÚ + LOGIN */}
        <div className="flex items-center gap-8">

          <nav className="hidden lg:flex items-center gap-6">
            <a href="#servicios" className="text-gray-700 hover:text-green-600">
              Servicios
            </a>

            <a href="#clientes" className="text-gray-700 hover:text-green-600">
              Clientes
            </a>

            <a href="#industrias" className="text-gray-700 hover:text-green-600">
              Industrias
            </a>

            <a href="#contacto" className="text-gray-700 hover:text-green-600">
              Contacto
            </a>
          </nav>

          <Button
            onClick={() => setShowLoginModal(true)}
            className="bg-green-600 hover:bg-green-700"
          >
            <LogIn className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">
              Iniciar Sesión
            </span>
            <span className="sm:hidden">
              Login
            </span>
          </Button>

        </div>

      </div>
      </div>
</header>
      {/* Modal de Login */}
      <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-center">Acceso al Sistema</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            <LoginForm />
          </div>
        </DialogContent>
      </Dialog>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-emerald-600 to-teal-700 text-white py-12 sm:py-20 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          ></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <div className="inline-block bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-4 sm:mb-6">
                <span className="text-xs sm:text-sm font-semibold">
                  🏆 Excelencia en Gestión Empresarial
                </span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight">
                Capacitamos, Asesoramos y{" "}
                <span className="text-yellow-300">Representamos</span> Empresas
              </h1>

              <p className="text-base sm:text-xl mb-6 sm:mb-8 text-green-50 leading-relaxed">
                Consultoría especializada en Calidad, Seguridad y Medio Ambiente
                para pequeñas, medianas y grandes empresas en Ecuador
              </p>

              <div className="flex flex-wrap gap-3 sm:gap-4 mb-6 sm:mb-8">
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base font-semibold">
                      ISO 9001
                    </span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base font-semibold">
                      ISO 45001
                    </span>
                  </div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm border border-white/30 px-4 sm:px-6 py-2 sm:py-3 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <Leaf className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-sm sm:text-base font-semibold">
                      ISO 14001
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <a
                  href="#servicios"
                  className="bg-white text-green-600 px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold hover:bg-green-50 transition-all transform hover:scale-105 shadow-xl text-center"
                >
                  Ver Servicios
                </a>
                <a
                  href="#contacto"
                  className="bg-transparent border-2 border-white text-white px-6 sm:px-8 py-3 sm:py-4 rounded-lg font-bold hover:bg-white/10 transition-all text-center"
                >
                  Contactar
                </a>
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 shadow-2xl">
                <h3 className="text-2xl font-bold mb-6">Acceso al Sistema</h3>
                <LoginForm />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="servicios" className="py-12 sm:py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Nuestros Servicios
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Soluciones integrales en Calidad, Seguridad y Medio Ambiente
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {mainServices.map((service, index) => {
              const gallery = serviceGalleries[service.id] || [];
              const hasImages = gallery.length > 0;

              return (
                <div
                  key={index}
                  onClick={() => hasImages && setSelectedService(service)}
                  className={`bg-white rounded-2xl shadow-xl overflow-hidden transform hover:scale-105 transition-all duration-300 ${
                    hasImages ? "cursor-pointer" : ""
                  }`}
                >
                  {/* Header con ícono y título */}
                  <div
                    className={`bg-gradient-to-r ${service.color} p-6 text-white`}
                  >
                    <service.icon className="w-10 h-10 sm:w-12 sm:h-12 mb-4" />
                    <h3 className="text-xl sm:text-2xl font-bold">
                      {service.title}
                    </h3>
                  </div>

                  {/* Lista de servicios */}
                  <div className="p-6">
                    <ul className="space-y-3">
                      {service.services.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-3">
                          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* MODAL DE GALERÍA */}
        {selectedService && (
          <ServiceGalleryModal
            service={selectedService}
            images={serviceGalleries[selectedService.id] || []}
            onClose={() => setSelectedService(null)}
          />
        )}
      </section>

      {/* Clientes Section — Carrusel */}
      <section id="clientes" className="py-12 sm:py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Nuestros Clientes
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Empresas que confían en nuestros servicios
            </p>
          </div>

          {loadingClients ? (
            <div className="flex justify-center py-12">
              <Loader className="w-12 h-12 animate-spin text-green-600" />
            </div>
          ) : clients.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-600">No hay clientes registrados</p>
            </div>
          ) : (
            <ClientCarousel clients={clients} />
          )}
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              ¿Por Qué Elegirnos?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Somos tu aliado estratégico en gestión empresarial
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {whyChooseUs.map((item, index) => (
              <div
                key={index}
                className="text-center p-6 rounded-xl hover:bg-green-50 transition-all"
              >
                <div className="inline-block bg-green-100 p-4 rounded-full mb-4">
                  <item.icon className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industries */}
      <section
        id="industrias"
        className="py-12 sm:py-20 bg-gradient-to-br from-gray-50 to-gray-100"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Industrias que Atendemos
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              Experiencia en diversos sectores productivos
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {industries.map((industry, index) => (
              <div
                key={index}
                className="bg-white p-4 sm:p-6 rounded-xl shadow-lg hover:shadow-2xl transition-all transform hover:scale-105 text-center"
              >
                <industry.icon className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 text-green-600" />
                <p className="text-sm sm:text-base font-semibold text-gray-800">
                  {industry.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-20 bg-gradient-to-r from-green-600 to-emerald-600 text-white">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4 sm:mb-6">
            ¿Listo para Mejorar tu Gestión Empresarial?
          </h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-green-50">
            Contáctanos hoy y descubre cómo podemos ayudarte
          </p>
          <a
            href="#contacto"
            className="inline-block bg-white text-green-600 px-8 sm:px-10 py-3 sm:py-4 rounded-lg font-bold text-base sm:text-lg hover:bg-green-50 transition-all transform hover:scale-105 shadow-xl"
          >
            Solicitar Consultoría
          </a>
        </div>
      </section>

      {/* Contact */}
      <section id="contacto" className="py-12 sm:py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4 sm:mb-6">
                Contáctenos
              </h2>
              <p className="text-base sm:text-lg text-gray-600 mb-6 sm:mb-8">
                Estamos aquí para ayudarte a mejorar la gestión de tu empresa
              </p>

              <div className="space-y-4 sm:space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Email</h3>
                    <a
                      href="mailto:ventas@consultoraeureka.ec"
                      className="text-sm sm:text-base text-green-600 hover:underline"
                    >
                      ventas@consultoraeureka.ec
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <Phone className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Teléfono</h3>
                    <a
                      href="tel:+593987514498"
                      className="text-sm sm:text-base text-green-600 hover:underline"
                    >
                      098 751 4498
                    </a>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">Ubicación</h3>
                    <p className="text-sm sm:text-base text-gray-600">
                      Ecuador
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 p-6 sm:p-8 rounded-2xl">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">
                Envíanos un Mensaje
              </h3>

              <form onSubmit={handleContactSubmit} className="space-y-4">
                <input
                  type="text"
                  placeholder="Nombre Completo"
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, email: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                />
                <input
                  type="tel"
                  placeholder="Teléfono"
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, phone: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                />
                <textarea
                  placeholder="Mensaje"
                  rows="4"
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition-all"
                  required
                ></textarea>
                <button
                  type="submit"
                  disabled={sendingMessage}
                  className="w-full bg-green-600 text-white px-6 py-4 rounded-lg font-bold hover:bg-green-700 transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {sendingMessage ? (
                    <>
                      <Loader className="w-5 h-5 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 mr-2" />
                      Enviar Mensaje
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 sm:py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="EUREKA Logo"
                    className="h-10 w-10 sm:h-12 sm:w-12 rounded-full"
                  />
                </div>
                <div>
                  <h4 className="text-lg sm:text-xl font-bold">EUREKA</h4>
                  <p className="text-green-400 text-xs">Sistemas Integrados</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm">
                Capacitamos, asesoramos y representamos empresas
              </p>
            </div>

            <div>
              <h5 className="text-base sm:text-lg font-bold mb-4">Servicios</h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• Gestión de Calidad</li>
                <li>• Seguridad y Salud</li>
                <li>• Gestión Ambiental</li>
                <li>• Certificaciones ISO</li>
              </ul>
            </div>

            <div>
              <h5 className="text-base sm:text-lg font-bold mb-4">
                Industrias
              </h5>
              <ul className="space-y-2 text-gray-400 text-sm">
                <li>• Alimentaria</li>
                <li>• Farmacéutica</li>
                <li>• Textil</li>
                <li>• Minería</li>
              </ul>
            </div>

            <div>
              <h5 className="text-base sm:text-lg font-bold mb-4">Contacto</h5>
              <p className="text-gray-400 text-sm mb-2">@eureka.ecu</p>
              <a
                href="tel:+593987514498"
                className="text-green-400 hover:underline text-sm"
              >
                098 751 4498
              </a>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 sm:pt-8 text-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              &copy; 2025 EUREKA - Consultora Ambiental. Todos los derechos
              reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;