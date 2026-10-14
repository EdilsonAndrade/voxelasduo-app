/** Categoria do Mercado Livre oferecida na pesquisa de nichos. */
export interface CategoriaNicho {
  id: string;
  nome: string;
  grupo: string;
}

/**
 * Categorias do ML com peças que fazem sentido imprimir em 3D (ids conferidos
 * em `GET /categories/{id}` em 2026-10-14). Lista fixa: as tendências de
 * categorias de móveis, roupas ou eletrônicos só trariam termos não imprimíveis.
 */
export const CATEGORIAS_NICHO: CategoriaNicho[] = [
  { id: "MLB1631", nome: "Enfeites e Decoração", grupo: "Casa" },
  { id: "MLB436414", nome: "Organização para Casa", grupo: "Casa" },
  { id: "MLB1618", nome: "Cozinha", grupo: "Casa" },
  { id: "MLB1613", nome: "Banheiros", grupo: "Casa" },
  { id: "MLB1582", nome: "Iluminação", grupo: "Casa" },
  { id: "MLB1621", nome: "Jardim", grupo: "Casa" },
  { id: "MLB1368", nome: "Papelaria e Escritório", grupo: "Escritório" },
  { id: "MLB2102", nome: "Equipamento para Escritório", grupo: "Escritório" },
  { id: "MLB432873", nome: "Hobbies", grupo: "Brinquedos" },
  { id: "MLB432991", nome: "Anti-stress", grupo: "Brinquedos" },
  { id: "MLB457877", nome: "Miniaturas", grupo: "Brinquedos" },
  { id: "MLB438578", nome: "Acessórios para Consoles", grupo: "Games" },
  { id: "MLB439527", nome: "Acessórios para PC Gamer", grupo: "Games" },
  { id: "MLB12404", nome: "Festas e Lembrancinhas", grupo: "Presentes" },
  { id: "MLB1071", nome: "Pets", grupo: "Outros" },
  { id: "MLB1747", nome: "Acessórios para Carros", grupo: "Outros" },
];

export function buscarCategoriaNicho(id: string): CategoriaNicho | undefined {
  return CATEGORIAS_NICHO.find((c) => c.id === id);
}
