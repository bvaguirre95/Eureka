import React, { useEffect, useState } from "react";
import Swal from "sweetalert2";
import sequenceService from "../services/sequence.service";
import DashboardLayout from "../components/layout/DashboardLayout";

export const SequencePage = () => {
  const { hasPermission } = useAuth();
  const canManage = hasPermission("sequences.manage");
  const [sequences, setSequences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingSequence, setEditingSequence] = useState(null);

  const loadSequences = async () => {
    setLoading(true);
    try {
        const data = await sequenceService.getSequences();
        setSequences(data);
    } catch (error) {
        Swal.fire({
            icon: "error",
            title: "No se pudieron cargar las secuencias",
            text: error.response?.data?.detail || "Intenta nuevamente",
            confirmButtonColor: "#16a34a",
        });
    } finally {
        setLoading(false);
    }
    };
    useEffect(() => {
        loadSequences();
    }, []);
    const openCreateModal = () => {
        setEditingSequence(null);
        setModalOpen(true);
    }
    const openEditModal = (sequence) => {
        setEditingSequence(sequence);
        setModalOpen(true);
    }
    return (
        <DashboardLayout>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Secuencias</h1>
                    <p className="text-gray-600">Administra las secuencias de tu aplicación.</p>
                </div>
                {canManage && (
                    <button className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                    onClick={openCreateModal} >
                    Crear Secuencia
                    </button>
                )}
            </div>
        </DashboardLayout>
    );
};
export default SequencePage;