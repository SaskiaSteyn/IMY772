import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	Alert,
	Button,
	Group,
	Paper,
	ScrollArea,
	SimpleGrid,
	Stack,
	Table,
	Text,
	TextInput,
	Title,
} from '@mantine/core'
import { adminApi } from '../../api/admin.js'

function buildInitialForm(fields) {
	return fields.reduce((acc, field) => {
		acc[field.key] = ''
		return acc
	}, {})
}

function mapRowToForm(fields, row) {
	return fields.reduce((acc, field) => {
		const value = row?.[field.key]
		if (value === null || value === undefined) {
			acc[field.key] = ''
		} else if (field.type === 'date') {
			acc[field.key] = String(value).slice(0, 10)
		} else {
			acc[field.key] = String(value)
		}
		return acc
	}, {})
}

function mapFormToPayload(fields, formValues) {
	return fields.reduce((acc, field) => {
		const rawValue = formValues[field.key]

		if (rawValue === '' || rawValue === undefined) {
			acc[field.key] = null
			return acc
		}

		if (field.type === 'number') {
			acc[field.key] = Number(rawValue)
			return acc
		}

		if (field.type === 'integer') {
			acc[field.key] = Number.parseInt(rawValue, 10)
			return acc
		}

		acc[field.key] = rawValue
		return acc
	}, {})
}

function getInputType(type) {
	if (type === 'date') {
		return 'date'
	}

	if (type === 'number' || type === 'integer') {
		return 'number'
	}

	return 'text'
}

function formatCell(value) {
	if (value === null || value === undefined || value === '') {
		return '-'
	}

	return String(value)
}

export default function WaterDataManager({ entity, title, fields }) {
	const [rows, setRows] = useState([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [editingRowId, setEditingRowId] = useState(null)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')
	const [formValues, setFormValues] = useState(() => buildInitialForm(fields))
	const isEditing = Boolean(editingRowId)

	const formTitle = useMemo(
		() => (isEditing ? `Edit ${title} Row` : `Create ${title} Row`),
		[isEditing, title]
	)

	const loadRows = useCallback(async () => {
		setLoading(true)
		setError('')

		try {
			const data = await adminApi.listData(entity)
			setRows(data.rows || [])
		} catch (err) {
			setError(err.message || 'Failed to load records')
		} finally {
			setLoading(false)
		}
	}, [entity])

	useEffect(() => {
		loadRows()
	}, [loadRows])

	function resetForm() {
		setEditingRowId(null)
		setFormValues(buildInitialForm(fields))
	}

	function onFieldChange(key, value) {
		setFormValues((prev) => ({ ...prev, [key]: value }))
	}

	function onEdit(row) {
		setEditingRowId(row._rowId)
		setFormValues(mapRowToForm(fields, row))
		setMessage('')
		setError('')
	}

	async function onSubmit(event) {
		event.preventDefault()
		setSaving(true)
		setError('')
		setMessage('')

		try {
			const payload = mapFormToPayload(fields, formValues)

			if (isEditing) {
				await adminApi.updateData(entity, editingRowId, payload)
				setMessage('Record updated')
			} else {
				await adminApi.createData(entity, payload)
				setMessage('Record created')
			}

			resetForm()
			await loadRows()
		} catch (err) {
			setError(err.message || 'Failed to save record')
		} finally {
			setSaving(false)
		}
	}

	async function onDelete(rowId) {
		const confirmed = window.confirm('Delete this record permanently?')
		if (!confirmed) {
			return
		}

		setError('')
		setMessage('')

		try {
			await adminApi.deleteData(entity, rowId)
			setMessage('Record deleted')
			if (editingRowId === rowId) {
				resetForm()
			}
			await loadRows()
		} catch (err) {
			setError(err.message || 'Failed to delete record')
		}
	}

	return (
		<Stack gap='md'>
			<Paper withBorder radius='md' p='lg' className='admin-card'>
				<Stack gap='md'>
					<Title order={2}>{title}</Title>

					{error && (
						<Alert color='red' variant='light'>
							{error}
						</Alert>
					)}
					{message && (
						<Alert color='green' variant='light'>
							{message}
						</Alert>
					)}

					<form onSubmit={onSubmit}>
						<Stack gap='md'>
							<Title order={4}>{formTitle}</Title>

							<SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing='sm'>
								{fields.map((field) => (
									<TextInput
										key={field.key}
										label={field.label}
										type={getInputType(field.type)}
										value={formValues[field.key] ?? ''}
										onChange={(event) =>
											onFieldChange(
												field.key,
												event.currentTarget.value
											)
										}
										required={Boolean(field.required)}
										step={
											field.type === 'number'
												? 'any'
												: undefined
										}
										classNames={{ input: 'admin-input' }}
									/>
								))}
							</SimpleGrid>

							<Group gap='sm'>
								<Button
									type='submit'
									loading={saving}
									color='themeColors.6'
								>
									{isEditing ? 'Update' : 'Create'}
								</Button>
								<Button
									type='button'
									variant='light'
									color='themeColors.6'
									onClick={resetForm}
									disabled={saving}
								>
									Clear
								</Button>
							</Group>
						</Stack>
					</form>
				</Stack>
			</Paper>

			<Paper withBorder radius='md' p='lg' className='admin-card'>
				{loading ? (
					<Text c='dimmed'>Loading...</Text>
				) : rows.length === 0 ? (
					<Text c='dimmed'>No records found</Text>
				) : (
					<ScrollArea>
						<Table
							withTableBorder
							withColumnBorders
							highlightOnHover
							striped
							horizontalSpacing='sm'
						>
							<Table.Thead>
								<Table.Tr>
									{fields.map((field) => (
										<Table.Th key={field.key}>
											{field.label}
										</Table.Th>
									))}
									<Table.Th>Actions</Table.Th>
								</Table.Tr>
							</Table.Thead>
							<Table.Tbody>
								{rows.map((row) => (
									<Table.Tr key={row._rowId}>
										{fields.map((field) => (
											<Table.Td key={`${row._rowId}-${field.key}`}>
												{formatCell(row[field.key])}
											</Table.Td>
										))}
										<Table.Td>
											<Group gap='xs' wrap='nowrap'>
												<Button
													type='button'
													size='xs'
													variant='light'
													color='themeColors.6'
													onClick={() => onEdit(row)}
												>
													Edit
												</Button>
												<Button
													type='button'
													size='xs'
													variant='outline'
													color='red'
													onClick={() =>
														onDelete(row._rowId)
													}
												>
													Delete
												</Button>
											</Group>
										</Table.Td>
									</Table.Tr>
								))}
							</Table.Tbody>
						</Table>
					</ScrollArea>
				)}
			</Paper>
		</Stack>
	)
}
